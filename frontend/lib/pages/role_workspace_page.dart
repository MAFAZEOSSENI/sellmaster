import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../auth/auth_provider.dart';
import '../models/order.dart';
import '../services/api_service.dart';
import 'orders_page.dart';

class RoleWorkspacePage extends StatefulWidget {
  final String role;

  const RoleWorkspacePage({Key? key, required this.role}) : super(key: key);

  @override
  State<RoleWorkspacePage> createState() => _RoleWorkspacePageState();
}

class _RoleWorkspacePageState extends State<RoleWorkspacePage> {
  bool _isLoading = true;
  List<Order> _orders = [];
  List<Map<String, dynamic>> _invitations = [];
  List<Map<String, dynamic>> _owners = [];
  int? _selectedOwnerId;

  @override
  void initState() {
    super.initState();
    _loadOrders();
    _loadInvitations();
  }

  Future<void> _loadOrders({int? ownerId}) async {
    try {
      final targetOwnerId = ownerId ?? _selectedOwnerId;
      final orders = await ApiService.getOrders(ownerId: targetOwnerId);
      if (!mounted) return;
      setState(() {
        _orders = _filterOrdersForOwner(orders, targetOwnerId);
        _selectedOwnerId = targetOwnerId;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erreur chargement du workspace: $e'),
          backgroundColor: const Color(0xFFEF5350),
        ),
      );
    }
  }

  List<Order> _filterOrdersForOwner(List<Order> orders, int? ownerId) {
    if (ownerId == null) {
      return orders;
    }

    return orders.where((order) => order.userId == ownerId).toList();
  }

  Future<void> _applyOwnerSelection(int? ownerId) async {
    if (ownerId == null) {
      return;
    }

    setState(() {
      _selectedOwnerId = ownerId;
    });
    await _loadOrders(ownerId: ownerId);
  }

  Future<void> _loadInvitations() async {
    try {
      final invitations = await ApiService.getPendingMemberships();
      if (!mounted) return;

      final activeOwners = invitations
          .where((item) => (item['status'] ?? 'pending') == 'active')
          .map((item) {
            final ownerId = item['owner_user_id'];
            final ownerName = item['owner_name'] ?? 'Propriétaire';
            return {
              'owner_user_id': ownerId,
              'owner_name': ownerName,
              'role_name': item['role_name'],
            };
          })
          .toList();

      setState(() {
        _invitations = invitations;
        _owners = activeOwners;
        if (_selectedOwnerId == null && activeOwners.isNotEmpty) {
          _selectedOwnerId = int.tryParse(activeOwners.first['owner_user_id'].toString());
        }
      });

      if (_selectedOwnerId != null) {
        await _loadOrders(ownerId: _selectedOwnerId);
      }
    } catch (e) {
      if (mounted) {
        print('Invitation load error: $e');
      }
    }
  }

  Future<void> _acceptInvitation(int membershipId) async {
    try {
      await ApiService.confirmMembership(membershipId);
      await _loadInvitations();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Invitation acceptée, vous êtes maintenant actif dans cette équipe.'),
          backgroundColor: Color(0xFF4CAF50),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Impossible d’accepter l’invitation: $e'),
          backgroundColor: const Color(0xFFEF5350),
        ),
      );
    }
  }

  String get title => widget.role == 'closer' ? 'Espace Closeur' : 'Espace Livreur';

  int? get currentUserId {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final rawId = authProvider.user?['id'];
    if (rawId is int) return rawId;
    if (rawId is String) return int.tryParse(rawId);
    if (rawId is num) return rawId.toInt();
    return null;
  }

  List<Order> get filteredOrders {
    final currentUserIdValue = currentUserId;

    if (widget.role == 'closer') {
      return _orders
          .where((order) =>
              (order.status == 'dashboard' || order.status == 'reportee') &&
              (order.assignedTo == null || order.assignedTo == currentUserIdValue))
          .toList();
    }

    return _orders
        .where((order) =>
            (order.status == 'dashboard' ||
                order.status == 'reportee' ||
                order.status == 'livree') &&
            (order.assignedTo == null || order.assignedTo == currentUserIdValue))
        .toList();
  }

  Map<String, int> get summary {
    final queue = filteredOrders;
    final enAttente = queue.where((o) => o.status == 'dashboard').length;
    final livrees = queue.where((o) => o.status == 'livree').length;
    final reportees = queue.where((o) => o.status == 'reportee').length;
    final annulees = queue.where((o) => o.status == 'annulee').length;
    return {
      'À traiter': enAttente,
      'Livrées': livrees,
      'Reportées': reportees,
      'Annulées': annulees,
    };
  }

  void _showCreateOrderDialog() {
    if (_selectedOwnerId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Sélectionnez un propriétaire avant de créer une commande.'),
          backgroundColor: Color(0xFFFF9800),
        ),
      );
      return;
    }

    showDialog(
      context: context,
      builder: (context) => CreateOrderDialog(
        ownerId: _selectedOwnerId,
        onOrderCreated: () => _loadOrders(ownerId: _selectedOwnerId),
      ),
    );
  }

  Future<void> _assignToMe(Order order) async {
    final userId = currentUserId;
    if (userId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Impossible d’identifier l’utilisateur connecté')),
      );
      return;
    }

    try {
      await ApiService.assignOrder(order.id.toString(), userId: userId, note: 'Assignée via l’espace ${widget.role}');
      await _loadOrders();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Commande ${order.customOrderNumber} assignée à votre queue'),
          backgroundColor: const Color(0xFF4CAF50),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Attribution impossible: $e'),
          backgroundColor: const Color(0xFFEF5350),
        ),
      );
    }
  }

  Future<void> _updateStatus(Order order, String status) async {
    try {
      await ApiService.updateOrderStatus(order.id.toString(), status);
      await _loadOrders();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Commande ${order.customOrderNumber} mise à jour'),
          backgroundColor: const Color(0xFF4CAF50),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Impossible de mettre à jour: $e'),
          backgroundColor: const Color(0xFFEF5350),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () => _loadOrders(ownerId: _selectedOwnerId),
      child: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        widget.role == 'closer'
                            ? Icons.headset_mic_outlined
                            : Icons.delivery_dining,
                        color: const Color(0xFF00BCD4),
                        size: 30,
                      ),
                      const SizedBox(width: 12),
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1A1A1A),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  if (_owners.isNotEmpty)
                    Container(
                      width: double.infinity,
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Mes propriétaires',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF1A1A1A),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: _owners.map((owner) {
                              final ownerId = int.tryParse(owner['owner_user_id'].toString());
                              final isSelected = ownerId != null && ownerId == _selectedOwnerId;
                              return ChoiceChip(
                                label: Text(owner['owner_name'] ?? 'Propriétaire'),
                                selected: isSelected,
                                onSelected: (_) => _applyOwnerSelection(ownerId),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    ),
                  GridView.count(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    childAspectRatio: 1.8,
                    children: summary.entries.map((entry) {
                      return Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x0F000000),
                              blurRadius: 10,
                              offset: Offset(0, 2),
                            ),
                          ],
                        ),
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              entry.key,
                              style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xFF64748B),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              '${entry.value}',
                              style: const TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF1A1A1A),
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 20),
                  if (_invitations.isNotEmpty)
                    Container(
                      width: double.infinity,
                      margin: const EdgeInsets.only(bottom: 20),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Invitations reçues',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF1A1A1A),
                            ),
                          ),
                          const SizedBox(height: 12),
                          ..._invitations.map((invitation) {
                            final ownerName = invitation['owner_name'] ?? 'Propriétaire';
                            final roleName = invitation['role_name'] ?? 'membre';
                            final status = invitation['status'] ?? 'pending';
                            final membershipId = invitation['id'];

                            return Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.center,
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Invitation de $ownerName',
                                          style: const TextStyle(fontWeight: FontWeight.w700),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          'Rôle: $roleName • Statut: ${status == 'active' ? 'acceptée' : 'en attente'}',
                                          style: const TextStyle(color: Color(0xFF64748B)),
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (status != 'active')
                                    ElevatedButton(
                                      onPressed: () => _acceptInvitation(int.tryParse(membershipId.toString()) ?? 0),
                                      child: const Text('Accepter'),
                                    ),
                                ],
                              ),
                            );
                          }),
                        ],
                      ),
                    ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _showCreateOrderDialog,
                      icon: const Icon(Icons.add, size: 18),
                      label: const Text(
                        'Créer une commande',
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF00BCD4),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Tâches à traiter',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1A1A1A),
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (filteredOrders.isEmpty)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Text(
                        'Aucune tâche pour le moment.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Color(0xFF64748B)),
                      ),
                    )
                  else
                    ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: filteredOrders.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final order = filteredOrders[index];
                        return Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      order.customOrderNumber,
                                      style: const TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: order.statusColor.withOpacity(0.12),
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                    child: Text(
                                      order.statusText,
                                      style: TextStyle(
                                        color: order.statusColor,
                                        fontWeight: FontWeight.w700,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                order.clientName,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                order.clientPhone.isNotEmpty ? order.clientPhone : 'Téléphone non renseigné',
                                style: const TextStyle(color: Color(0xFF64748B)),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                order.clientAddress.isNotEmpty ? order.clientAddress : 'Adresse non renseignée',
                                style: const TextStyle(color: Color(0xFF64748B)),
                              ),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      '${order.totalAmount.toStringAsFixed(0)} €',
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFF00BCD4),
                                      ),
                                    ),
                                  ),
                                  Text(
                                    '${order.createdAt.day.toString().padLeft(2, '0')}/${order.createdAt.month.toString().padLeft(2, '0')}/${order.createdAt.year}',
                                    style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      order.assignedTo == null
                                          ? 'Non assignée'
                                          : 'Assignée à #${order.assignedTo}',
                                      style: const TextStyle(
                                        color: Color(0xFF64748B),
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                  if (order.assignedTo != currentUserId)
                                    TextButton.icon(
                                      onPressed: () => _assignToMe(order),
                                      icon: const Icon(Icons.assignment_ind_outlined, size: 16),
                                      label: const Text('Me l’assigner'),
                                    )
                                ],
                              ),
                              const SizedBox(height: 12),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: [
                                  _statusChip('dashboard', 'À traiter', order),
                                  _statusChip('reportee', 'Reporter', order),
                                  _statusChip('livree', 'Livrée', order),
                                  _statusChip('annulee', 'Annulée', order),
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                ],
              ),
            ),
    );
  }

  Widget _statusChip(String status, String label, Order order) {
    final isActive = order.status == status;
    return ChoiceChip(
      label: Text(label),
      selected: isActive,
      selectedColor: const Color(0xFF00BCD4),
      backgroundColor: const Color(0xFFF5F7FA),
      labelStyle: TextStyle(
        color: isActive ? Colors.white : const Color(0xFF1A1A1A),
        fontWeight: FontWeight.w600,
      ),
      onSelected: (_) => _updateStatus(order, status),
    );
  }
}
