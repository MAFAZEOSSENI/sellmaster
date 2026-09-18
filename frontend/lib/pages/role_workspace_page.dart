import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../auth/auth_provider.dart';
import '../models/order.dart';
import '../services/api_service.dart';

class RoleWorkspacePage extends StatefulWidget {
  final String role;

  const RoleWorkspacePage({Key? key, required this.role}) : super(key: key);

  @override
  State<RoleWorkspacePage> createState() => _RoleWorkspacePageState();
}

class _RoleWorkspacePageState extends State<RoleWorkspacePage> {
  bool _isLoading = true;
  List<Order> _orders = [];

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    try {
      final orders = await ApiService.getOrders();
      if (!mounted) return;
      setState(() {
        _orders = orders;
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
      onRefresh: _loadOrders,
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
