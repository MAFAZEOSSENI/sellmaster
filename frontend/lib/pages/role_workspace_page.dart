import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../auth/auth_provider.dart';
import '../models/order.dart';
import '../services/api_service.dart';
import 'orders_page.dart';
import 'products_page.dart';

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
  List<Map<String, dynamic>> _myTeams = [];
  List<Map<String, dynamic>> _teamCouriers = [];
  int? _selectedOwnerId;
  int? _selectedCourierIdForOrder;
  Timer? _earningsTimer;
  double _earningsTotal = 0;
  List<Map<String, dynamic>> _earnings = [];

  @override
  void initState() {
    super.initState();
    _loadMyTeams();
    _loadEarnings();
    _earningsTimer = Timer.periodic(const Duration(seconds: 30), (_) => _loadEarnings());
  }

  @override
  void dispose() {
    _earningsTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadEarnings() async {
    try {
      final data = await ApiService.getMyEarnings();
      if (!mounted) return;
      setState(() {
        _earningsTotal = double.tryParse(data['total'].toString()) ?? 0;
        _earnings = (data['earnings'] as List? ?? const [])
            .map((item) => Map<String, dynamic>.from(item as Map))
            .toList();
      });
    } catch (_) {
      // Earnings should not block the operational workspace.
    }
  }

  Future<void> _loadOrders({int? ownerId, Set<int>? ownerIds}) async {
    try {
      final targetOwnerId = ownerId ?? _selectedOwnerId;
      final orders = targetOwnerId == null
          ? await ApiService.getOrders()
          : await ApiService.getOrders(ownerId: targetOwnerId);
      if (!mounted) return;

      final effectiveOwnerIds = ownerIds ?? (targetOwnerId != null ? {targetOwnerId} : <int>{});
      setState(() {
        _orders = _filterOrdersForOwner(orders, effectiveOwnerIds.isNotEmpty ? effectiveOwnerIds : null);
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

  List<Order> _filterOrdersForOwner(List<Order> orders, Set<int>? ownerIds) {
    if (ownerIds == null || ownerIds.isEmpty) {
      return orders;
    }

    return orders.where((order) => ownerIds.contains(order.userId)).toList();
  }

  Future<void> _applyOwnerSelection(int? ownerId) async {
    if (ownerId == null) {
      return;
    }

    setState(() {
      _selectedOwnerId = ownerId;
      _selectedCourierIdForOrder = null;
    });
    await _loadCouriersForOwner(ownerId);
    await _loadOrders(ownerId: ownerId);
  }

  Future<void> _loadCouriersForOwner(int ownerId) async {
    try {
      if (widget.role == 'courier') {
        setState(() => _teamCouriers = []);
        return;
      }

      final couriers = await ApiService.getActiveTeamMembers(ownerId: ownerId);
      if (!mounted) return;
      setState(() => _teamCouriers = couriers);
    } catch (e) {
      if (!mounted) return;
      setState(() => _teamCouriers = []);
    }
  }

  Future<void> _loadMyTeams() async {
    try {
      final teams = await ApiService.getMyTeams();
      if (!mounted) return;

      final activeOwners = teams
          .where((item) {
            final status = (item['status'] ?? 'pending').toString();
            final isWorking = item['is_working'] == true || item['is_working'] == 1 || item['is_working'] == '1';
            return status == 'active' || status == 'pending';
          })
          .map((item) {
            final ownerId = int.tryParse(item['owner_user_id'].toString());
            final ownerName = (item['nickname'] ?? item['owner_name'] ?? 'Propriétaire').toString();
            final isWorking = item['is_working'] == true || item['is_working'] == 1 || item['is_working'] == '1';
            return {
              'id': item['id'],
              'owner_user_id': ownerId,
              'owner_name': ownerName,
              'nickname': item['nickname'] ?? ownerName,
              'role_name': item['role_name'],
              'status': item['status'],
              'is_working': isWorking,
            };
          })
          .toList();

      final workingOwnerIds = activeOwners
          .where((owner) => owner['is_working'] == true)
          .map((owner) => int.tryParse(owner['owner_user_id'].toString()))
          .whereType<int>()
          .toSet();

      setState(() {
        _myTeams = teams;
        _invitations = teams.where((item) => (item['status'] ?? 'pending').toString() != 'rejected').toList();
        _owners = activeOwners;
        _selectedOwnerId = workingOwnerIds.isNotEmpty ? workingOwnerIds.first : (activeOwners.isNotEmpty ? int.tryParse(activeOwners.first['owner_user_id'].toString()) : null);
      });

      if (workingOwnerIds.isNotEmpty) {
        final firstOwnerId = workingOwnerIds.first;
        setState(() => _selectedOwnerId = firstOwnerId);
        await _loadCouriersForOwner(firstOwnerId);
        await _loadOrders(ownerIds: workingOwnerIds);
      } else if (_selectedOwnerId != null) {
        await _loadCouriersForOwner(_selectedOwnerId!);
        await _loadOrders(ownerId: _selectedOwnerId);
      } else {
        setState(() => _orders = []);
      }
    } catch (e) {
      if (mounted) {
        print('My teams load error: $e');
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _saveTeamState(int membershipId, {String? nickname, bool? isWorking}) async {
    try {
      final updated = await ApiService.updateMyTeam(membershipId, nickname: nickname, isWorking: isWorking);
      if (!mounted) return;

      final updatedOwnerName = (updated['nickname'] ?? updated['owner_name'] ?? 'Propriétaire').toString();
      setState(() {
        _myTeams = _myTeams.map((team) {
          if (team['id'] == membershipId) {
            return {
              ...team,
              'nickname': updated['nickname'] ?? team['nickname'] ?? updatedOwnerName,
              'is_working': updated['is_working'] ?? team['is_working'] ?? false,
            };
          }
          return team;
        }).toList();
      });

      await _loadMyTeams();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Paramètres de l’équipe mis à jour.'),
          backgroundColor: Color(0xFF4CAF50),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Impossible de mettre à jour l’équipe: $e'),
          backgroundColor: const Color(0xFFEF5350),
        ),
      );
    }
  }

  Future<void> _acceptInvitation(int membershipId) async {
    try {
      await ApiService.confirmMembership(membershipId);
      await _loadMyTeams();
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

  Future<void> _loadInvitations() async {
    await _loadMyTeams();
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
        order.assignedTo == currentUserIdValue)
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

  Future<void> _assignToCourier(Order order, int courierUserId) async {
    try {
      await ApiService.assignOrder(
        order.id.toString(),
        userId: courierUserId,
        note: 'Assignée via l’espace ${widget.role}',
      );
      await _loadOrders(ownerId: _selectedOwnerId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Commande ${order.customOrderNumber} assignée au livreur sélectionné'),
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

  Future<void> _updateStatus(Order order, String status, {double? deliveryFee}) async {
    try {
      await ApiService.updateOrderStatus(order.id.toString(), status, deliveryFee: deliveryFee);
      await _loadOrders();
      await _loadEarnings();
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

  Future<void> _handleStatusSelection(Order order, String status) async {
    if (status != 'livree' || widget.role != 'courier') {
      await _updateStatus(order, status);
      return;
    }

    final controller = TextEditingController();
    final deliveryFee = await showDialog<double>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Frais de livraison'),
        content: TextField(
          controller: controller,
          autofocus: true,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(
            labelText: 'Montant',
            suffixText: '€',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () {
              final value = double.tryParse(controller.text.replaceAll(',', '.'));
              if (value == null || value <= 0) return;
              Navigator.of(dialogContext).pop(value);
            },
            child: const Text('Valider'),
          ),
        ],
      ),
    );
    controller.dispose();

    if (deliveryFee != null) {
      await _updateStatus(order, status, deliveryFee: deliveryFee);
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
                            'Mes équipes actives',
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
                              final isWorking = owner['is_working'] == true;
                              return ChoiceChip(
                                label: Text((owner['nickname'] ?? owner['owner_name'] ?? 'Propriétaire').toString()),
                                selected: isSelected,
                                avatar: isWorking ? const Icon(Icons.check_circle, size: 16) : const Icon(Icons.pause_circle, size: 16),
                                onSelected: (_) => _applyOwnerSelection(ownerId),
                              );
                            }).toList(),
                          ),
                          const SizedBox(height: 12),
                          ..._owners.map((team) {
                            final ownerId = int.tryParse(team['owner_user_id'].toString());
                            final membershipId = team['id'];
                            final nickname = team['nickname'] ?? team['owner_name'] ?? 'Propriétaire';
                            final isWorking = team['is_working'] == true;
                            if (ownerId == null || membershipId == null) {
                              return const SizedBox.shrink();
                            }

                            return Container(
                              margin: const EdgeInsets.only(top: 8),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          nickname,
                                          style: const TextStyle(fontWeight: FontWeight.w700),
                                        ),
                                        Text(
                                          (team['status'] ?? 'active') == 'pending' ? 'Invitation en attente' : 'Equipe active',
                                          style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Switch(
                                    value: isWorking,
                                    activeColor: const Color(0xFF00BCD4),
                                    onChanged: (value) => _saveTeamState(int.parse(membershipId.toString()), isWorking: value),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        ],
                      ),
                    ),
                  if (widget.role == 'closer' || widget.role == 'courier')
                    _buildEarningsSection(),
                  if (widget.role == 'closer' || widget.role == 'courier')
                    const SizedBox(height: 16),
                  if (widget.role == 'closer') ...[
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: _selectedOwnerId == null
                            ? null
                            : () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => ProductsPage(ownerId: _selectedOwnerId),
                                  ),
                                );
                              },
                        icon: const Icon(Icons.inventory_2_outlined),
                        label: const Text('Consulter le catalogue produits'),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
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
                              if (widget.role != 'courier')
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Attribuer à un livreur',
                                      style: TextStyle(
                                        color: Color(0xFF64748B),
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    if (_teamCouriers.isEmpty)
                                      const Text(
                                        'Aucun livreur actif et disponible dans cette équipe.',
                                        style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                                      )
                                    else
                                      Row(
                                        children: [
                                          Expanded(
                                            child: DropdownButtonFormField<int>(
                                              value: _teamCouriers
                                                  .map((courier) => int.tryParse(courier['member_user_id'].toString()))
                                                  .whereType<int>()
                                                  .contains(order.assignedTo)
                                                  ? order.assignedTo
                                                  : null,
                                              decoration: InputDecoration(
                                                filled: true,
                                                fillColor: const Color(0xFFF8FAFC),
                                                border: OutlineInputBorder(
                                                  borderRadius: BorderRadius.circular(10),
                                                  borderSide: BorderSide.none,
                                                ),
                                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                              ),
                                              items: _teamCouriers
                                                  .map((courier) {
                                                    final courierId = int.tryParse(courier['member_user_id'].toString());
                                                    if (courierId == null) return null;
                                                    return DropdownMenuItem<int>(
                                                      value: courierId,
                                                      child: Text(
                                                        (courier['full_name'] ?? courier['email'] ?? 'Livreur').toString(),
                                                      ),
                                                    );
                                                  })
                                                  .whereType<DropdownMenuItem<int>>()
                                                  .toList(),
                                              onChanged: (courierId) {
                                                if (courierId == null) return;
                                                _assignToCourier(order, courierId);
                                              },
                                              hint: const Text('Choisir un livreur'),
                                            ),
                                          ),
                                        ],
                                      ),
                                  ],
                                )
                              else
                                Text(
                                  order.assignedTo == null
                                      ? 'Non assignée'
                                      : 'Assignée à #${order.assignedTo}',
                                  style: const TextStyle(
                                    color: Color(0xFF64748B),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
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

  Widget _buildEarningsSection() {
    final label = widget.role == 'closer' ? 'Commissions gagnées' : 'Frais de livraison gagnés';
    return Container(
      width: double.infinity,
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
              const Icon(Icons.payments_outlined, color: Color(0xFF00BCD4)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(label, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              ),
              Text('${_earningsTotal.toStringAsFixed(2)} €', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            ],
          ),
          if (_earnings.isNotEmpty) ...[
            const SizedBox(height: 12),
            ..._earnings.map((earning) => Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Row(
                    children: [
                      Expanded(child: Text((earning['owner_name'] ?? 'Propriétaire').toString())),
                      Text('${(double.tryParse(earning['total_amount'].toString()) ?? 0).toStringAsFixed(2)} €'),
                    ],
                  ),
                )),
          ] else
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text('Aucun gain enregistré pour le moment.', style: TextStyle(color: Color(0xFF64748B))),
            ),
        ],
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
      onSelected: (_) => _handleStatusSelection(order, status),
    );
  }
}
