import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../auth/auth_provider.dart';
import '../services/api_service.dart';
import '../models/order.dart';
import '../models/product.dart';
import 'profitability_page.dart';

class DashboardPage extends StatefulWidget {
  const DashboardPage({Key? key}) : super(key: key);

  @override
  DashboardPageState createState() => DashboardPageState();
}

class DashboardPageState extends State<DashboardPage> {
  List<Order> orders = [];
  List<Product> products = [];
  bool isLoading = true;
  int? _selectedOwnerId;

  @override
  void initState() {
    super.initState();
    loadDashboardData();
  }

  Future<void> loadDashboardData({int? ownerId}) async {
    try {
      final targetOwnerId = ownerId ?? _selectedOwnerId;
      final results = await Future.wait([
        ApiService.getOrders(ownerId: targetOwnerId),
        ApiService.getProducts(ownerId: targetOwnerId),
      ]);

      setState(() {
        _selectedOwnerId = targetOwnerId;
        orders = results[0] as List<Order>;
        products = results[1] as List<Product>;
        isLoading = false;
      });

      setState(() {
        orders = results[0] as List<Order>;
        products = results[1] as List<Product>;
        isLoading = false;
      });
    } catch (e) {
      debugPrint('Erreur chargement dashboard: $e');
      setState(() {
        isLoading = false;
      });
    }
  }

  double getRealRevenue() {
    return orders
        .where((order) => order.status == 'livree')
        .fold(0.0, (sum, order) => sum + order.totalAmount);
  }

  int getOrdersCount(String status) {
    return orders.where((order) => order.status == status).length;
  }

  int getAssignedOrdersCount() {
    return orders.where((order) => order.assignedTo != null).length;
  }

  int getUnassignedOrdersCount() {
    return orders.where((order) => order.assignedTo == null).length;
  }

  List<Order> getTeamQueue() {
    return orders
        .where((order) => order.assignedTo != null || order.status == 'dashboard')
        .take(5)
        .toList();
  }

  List<Map<String, dynamic>> getTeamAssignments() {
    final grouped = <int, Map<String, dynamic>>{};

    for (final order in orders.where((order) => order.assignedTo != null)) {
      final userId = order.assignedTo!;
      if (!grouped.containsKey(userId)) {
        grouped[userId] = {
          'userId': userId,
          'total': 0,
          'inProgress': 0,
          'delivered': 0,
          'reported': 0,
        };
      }

      final bucket = grouped[userId]!;
      bucket['total'] = (bucket['total'] as int) + 1;
      if (order.status == 'dashboard') {
        bucket['inProgress'] = (bucket['inProgress'] as int) + 1;
      } else if (order.status == 'livree') {
        bucket['delivered'] = (bucket['delivered'] as int) + 1;
      } else if (order.status == 'reportee') {
        bucket['reported'] = (bucket['reported'] as int) + 1;
      }
    }

    final entries = grouped.values.toList();
    entries.sort((a, b) => (b['total'] as int).compareTo(a['total'] as int));
    return entries;
  }

  int getTotalOrders() {
    return orders.length;
  }

  double getDeliveryRate() {
    if (orders.isEmpty) return 0.0;
    return (getOrdersCount('livree') / orders.length) * 100;
  }

  List<Product> getTopProducts() {
    return products.take(3).toList();
  }

  List<Order> getRecentOrders() {
    return orders.take(5).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAFBFC),
      body: isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF00ACC1)))
          : RefreshIndicator(
              onRefresh: loadDashboardData,
              color: const Color(0xFF00ACC1),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Column(
                  children: [
                    // Nouveau Header avec profil
                    _buildHeader(),
                    
                    // Contenu principal
                    Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Cartes de statistiques
                          _buildStatsCards(),
                          const SizedBox(height: 24),
                          
                          // Commandes récentes
                          _buildRecentOrders(),
                          const SizedBox(height: 24),

                          // Queue équipe / assignations
                          _buildTeamQueue(),
                          const SizedBox(height: 24),

                          // Suivi équipe
                          _buildTeamOverview(),
                          const SizedBox(height: 24),

                          if (Provider.of<AuthProvider>(context, listen: false).primaryRole == 'owner')
                            SizedBox(
                              width: double.infinity,
                              child: OutlinedButton.icon(
                                onPressed: () => Navigator.of(context).push(
                                  MaterialPageRoute(builder: (_) => const ProfitabilityPage()),
                                ),
                                icon: const Icon(Icons.analytics_outlined),
                                label: const Text('Voir la rentabilité'),
                              ),
                            ),
                          if (Provider.of<AuthProvider>(context, listen: false).primaryRole == 'owner')
                            const SizedBox(height: 24),
                          
                          // Produits populaires
                          _buildTopProducts(),
                          const SizedBox(height: 20),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildHeader() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 60, 20, 20),
      decoration: const BoxDecoration(
        color: Colors.white,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Bonjour,',
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 16,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Manager',
                    style: TextStyle(
                      color: Color(0xFF1A1A1A),
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF5F7FA),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.notifications_outlined,
                      color: Colors.grey[600],
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: const Color(0xFF00ACC1),
                      borderRadius: BorderRadius.circular(22),
                    ),
                    child: const Icon(
                      Icons.person,
                      color: Colors.white,
                      size: 24,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),
          
          // Chiffre d'affaires principal
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFF00ACC1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Chiffre d\'Affaires',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${getRealRevenue().toStringAsFixed(0)}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        letterSpacing: -1,
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Padding(
                      padding: EdgeInsets.only(bottom: 6),
                      child: Text(
                        'FCFA',
                        style: TextStyle(
                          color: Colors.white70,
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsCards() {
    final totalOrders = getTotalOrders();
    final deliveryRate = getDeliveryRate();
    
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 1.1,
      children: [
        _buildStatCard(
          'Total Commandes',
          '$totalOrders',
          Icons.receipt_long_rounded,
          const Color(0xFFE3F2FD),
          const Color(0xFF1976D2),
        ),
        _buildStatCard(
          'Taux Livraison',
          '${deliveryRate.toStringAsFixed(1)}%',
          Icons.local_shipping_rounded,
          const Color(0xFFFCE4EC),
          const Color(0xFFC2185B),
        ),
        _buildStatCard(
          'En Attente',
          '${getOrdersCount("en_attente")}',
          Icons.pending_actions_rounded,
          const Color(0xFFE8F5E8),
          const Color(0xFF2E7D32),
        ),
        _buildStatCard(
          'Produits Stock',
          '${products.length}',
          Icons.inventory_rounded,
          const Color(0xFFFFF8E1),
          const Color(0xFFF57C00),
        ),
      ],
    );
  }

  Widget _buildStatCard(
      String title, String value, IconData icon, Color bgColor, Color iconColor) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE8ECF4)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: iconColor, size: 24),
            ),
            const Spacer(),
            Text(
              value,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1A1A1A),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: const TextStyle(
                fontSize: 12,
                color: Color(0xFF64748B),
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentOrders() {
    final recentOrders = getRecentOrders();
    
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE8ECF4)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Commandes Récentes',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1A1A1A),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE3F2FD),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${recentOrders.length}/5',
                    style: const TextStyle(
                      color: Color(0xFF1976D2),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...recentOrders.map((order) => _buildOrderItem(order)),
            if (recentOrders.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 20),
                child: Column(
                  children: [
                    Icon(Icons.receipt_long, size: 48, color: Colors.grey[300]),
                    const SizedBox(height: 8),
                    Text(
                      'Aucune commande récente',
                      style: TextStyle(color: Colors.grey[500], fontSize: 14),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderItem(Order order) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: _getStatusColor(order.status).withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              _getStatusIcon(order.status),
              color: _getStatusColor(order.status),
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  order.clientName,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1A1A1A),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _formatDate(order.createdAt),
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${order.totalAmount} F',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF00ACC1),
                ),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _getStatusColor(order.status).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  _getStatusText(order.status),
                  style: TextStyle(
                    color: _getStatusColor(order.status),
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTeamQueue() {
    final queue = getTeamQueue();
    final assignedCount = getAssignedOrdersCount();
    final unassignedCount = getUnassignedOrdersCount();

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE8ECF4)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Queue équipe',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1A1A1A),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildQueueMetric('Assignées', '$assignedCount', const Color(0xFFE0F7FA), const Color(0xFF00ACC1)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildQueueMetric('Non assignées', '$unassignedCount', const Color(0xFFFFF3E0), const Color(0xFFF57C00)),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (queue.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Text(
                  'Aucune commande en queue opérationnelle.',
                  style: TextStyle(color: Colors.grey[500], fontSize: 14),
                ),
              )
            else
              ...queue.map((order) {
                final assignedLabel = order.assignedTo == null
                    ? 'Non assignée'
                    : 'Assignée #${order.assignedTo}';

                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
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
                              order.customOrderNumber,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF1A1A1A),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              order.clientName,
                              style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: order.assignedTo == null
                                  ? const Color(0xFFFFF3E0)
                                  : const Color(0xFFE0F7FA),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              assignedLabel,
                              style: TextStyle(
                                color: order.assignedTo == null
                                    ? const Color(0xFFF57C00)
                                    : const Color(0xFF00ACC1),
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${order.totalAmount.toStringAsFixed(0)} F',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF00ACC1),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }

  Widget _buildQueueMetric(String label, String value, Color backgroundColor, Color accentColor) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: accentColor,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w800,
              color: accentColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTeamOverview() {
    final teamAssignments = getTeamAssignments();
    if (teamAssignments.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE8ECF4)),
        ),
        child: const Text(
          'Aucune commande assignée pour le moment.',
          style: TextStyle(
            color: Color(0xFF64748B),
            fontSize: 14,
          ),
        ),
      );
    }

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE8ECF4)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Suivi équipe',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1A1A1A),
              ),
            ),
            const SizedBox(height: 16),
            ...teamAssignments.map((member) {
              final userId = member['userId'] as int;
              final total = member['total'] as int;
              final inProgress = member['inProgress'] as int;
              final delivered = member['delivered'] as int;
              final reported = member['reported'] as int;

              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: const BoxDecoration(
                        color: Color(0xFFE0F7FA),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.person_outline,
                        color: Color(0xFF00ACC1),
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Agent #$userId',
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF1A1A1A),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '$total tâche(s) active(s) · $inProgress en cours · $delivered livrées · $reported reportées',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE3F2FD),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        '$total',
                        style: const TextStyle(
                          color: Color(0xFF1976D2),
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildTopProducts() {
    final topProducts = getTopProducts();
    
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE8ECF4)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Produits en Stock',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1A1A1A),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE3F2FD),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${topProducts.length}/3',
                    style: const TextStyle(
                      color: Color(0xFF1976D2),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...topProducts.map((product) => _buildProductItem(product)),
            if (topProducts.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 20),
                child: Column(
                  children: [
                    Icon(Icons.inventory_2, size: 48, color: Colors.grey[300]),
                    const SizedBox(height: 8),
                    Text(
                      'Aucun produit en stock',
                      style: TextStyle(color: Colors.grey[500], fontSize: 14),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildProductItem(Product product) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: const Color(0xFFE3F2FD),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              Icons.shopping_bag_rounded,
              color: Color(0xFF1976D2),
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.name,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1A1A1A),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${product.price} FCFA',
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF00ACC1),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: product.stock > 0 
                  ? const Color(0xFFE8F5E8)
                  : const Color(0xFFFFEBEE),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              '${product.stock}',
              style: TextStyle(
                color: product.stock > 0 
                    ? const Color(0xFF2E7D32)
                    : const Color(0xFFC62828),
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'livree':
        return const Color(0xFF2E7D32);
      case 'annulee':
        return const Color(0xFFC62828);
      case 'reportee':
        return const Color(0xFFF57C00);
      default:
        return const Color(0xFF1976D2);
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'livree':
        return Icons.check_circle_rounded;
      case 'annulee':
        return Icons.cancel_rounded;
      case 'reportee':
        return Icons.schedule_rounded;
      default:
        return Icons.pending_rounded;
    }
  }

  String _getStatusText(String status) {
    switch (status) {
      case 'livree':
        return 'Livrée';
      case 'annulee':
        return 'Annulée';
      case 'reportee':
        return 'Reportée';
      default:
        return 'En attente';
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}