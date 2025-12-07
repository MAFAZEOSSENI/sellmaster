import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/order.dart';
import '../models/product.dart';

class OrdersPage extends StatefulWidget {
  const OrdersPage({Key? key}) : super(key: key);

  @override
  OrdersPageState createState() => OrdersPageState();
}

class OrdersPageState extends State<OrdersPage> {
  List<Order> orders = [];
  bool isLoading = true;
  String _currentFilter = 'Toutes';

  final List<String> _filters = [
    'Toutes',
    'En attente',
    'Livrées',
    'Annulées',
    'Reportées'
  ];

  @override
  void initState() {
    super.initState();
    loadOrders();
  }

  Future<void> loadOrders() async {
    try {
      final ordersData = await ApiService.getOrders();
      setState(() {
        orders = ordersData;
        isLoading = false;
      });
    } catch (e) {
      debugPrint('Erreur chargement commandes: $e');
      setState(() {
        isLoading = false;
      });
    }
  }

  List<Order> get filteredOrders {
    if (_currentFilter == 'Toutes') return orders;
    if (_currentFilter == 'Livrées') {
      return orders.where((order) => order.status == 'livree').toList();
    }
    if (_currentFilter == 'Annulées') {
      return orders.where((order) => order.status == 'annulee').toList();
    }
    if (_currentFilter == 'Reportées') {
      return orders.where((order) => order.status == 'reportee').toList();
    }
    if (_currentFilter == 'En attente') {
      return orders.where((order) => order.status == 'dashboard').toList();
    }
    return orders;
  }

  void _showCreateOrderDialog() {
    showDialog(
      context: context,
      builder: (context) => CreateOrderDialog(onOrderCreated: loadOrders),
    );
  }

  void _updateOrderStatus(String orderId, String newStatus) async {
    try {
      await ApiService.updateOrderStatus(orderId, newStatus);
      if (mounted) {
        loadOrders();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Statut mis à jour: ${_getStatusText(newStatus)}'),
            backgroundColor: const Color(0xFF4CAF50),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur: $e'),
            backgroundColor: const Color(0xFFEF5350),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
        );
      }
    }
  }

  void _showQuickActions(Order order) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(24),
            topRight: Radius.circular(24),
          ),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFE8ECF4),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Changer le statut',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: Color(0xFF1A1A1A),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              '${order.customOrderNumber}', // 🆕 MODIFIÉ: customOrderNumber au lieu de id
              style: const TextStyle(
                color: Color(0xFF64748B),
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 24),
            Column(
              children: [
                _buildQuickActionButton(
                  context,
                  order,
                  'dashboard',
                  'En attente',
                  const Color(0xFF00BCD4),
                  Icons.pending_actions,
                ),
                const SizedBox(height: 12),
                _buildQuickActionButton(
                  context,
                  order,
                  'livree',
                  'Livrée',
                  const Color(0xFF4CAF50),
                  Icons.check_circle,
                ),
                const SizedBox(height: 12),
                _buildQuickActionButton(
                  context,
                  order,
                  'annulee',
                  'Annulée',
                  const Color(0xFFEF5350),
                  Icons.cancel,
                ),
                const SizedBox(height: 12),
                _buildQuickActionButton(
                  context,
                  order,
                  'reportee',
                  'Reportée',
                  const Color(0xFFFF9800),
                  Icons.schedule,
                ),
              ],
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => Navigator.of(context).pop(),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  side: const BorderSide(color: Color(0xFFE8ECF4)),
                ),
                child: const Text(
                  'Fermer',
                  style: TextStyle(
                    color: Color(0xFF64748B),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActionButton(
    BuildContext context,
    Order order,
    String status,
    String label,
    Color color,
    IconData icon,
  ) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        icon: Icon(icon, color: Colors.white, size: 20),
        label: Text(
          label,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        onPressed: () {
          Navigator.of(context).pop();
          _updateOrderStatus(order.id.toString(), status);
        },
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'livree':
        return const Color(0xFF4CAF50);
      case 'annulee':
        return const Color(0xFFEF5350);
      case 'reportee':
        return const Color(0xFFFF9800);
      default:
        return const Color(0xFF00BCD4);
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        title: const Text(
          'Commandes',
          style: TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 24,
            color: Color(0xFF1A1A1A),
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        toolbarHeight: 80,
        actions: [
          IconButton(
            icon: Icon(Icons.notifications_outlined, color: Colors.grey[700]),
            onPressed: () {},
          ),
          const SizedBox(width: 8),
          Container(
            width: 36,
            height: 36,
            margin: const EdgeInsets.only(right: 20),
            decoration: BoxDecoration(
              color: const Color(0xFF00BCD4),
              borderRadius: BorderRadius.circular(18),
            ),
            child: const Icon(Icons.person, color: Colors.white, size: 20),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filtres
          Container(
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(
                bottom: BorderSide(color: Colors.grey.shade100),
              ),
            ),
            child: SizedBox(
              height: 40,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: _filters.length,
                itemBuilder: (context, index) {
                  final filter = _filters[index];
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(
                        filter,
                        style: TextStyle(
                          color: _currentFilter == filter 
                              ? const Color(0xFF00ACC1) 
                              : const Color(0xFF64748B),
                          fontWeight: FontWeight.w500,
                          fontSize: 13,
                        ),
                      ),
                      selected: _currentFilter == filter,
                      onSelected: (selected) {
                        setState(() {
                          _currentFilter = filter;
                        });
                      },
                      selectedColor: const Color(0xFFE0F7FA),
                      backgroundColor: Colors.white,
                      checkmarkColor: const Color(0xFF00ACC1),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                        side: BorderSide(
                          color: _currentFilter == filter 
                              ? const Color(0xFF00BCD4) 
                              : const Color(0xFFE8ECF4),
                        ),
                      ),
                      elevation: 0,
                      showCheckmark: false,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
                    ),
                  );
                },
              ),
            ),
          ),
          // Liste des commandes
          Expanded(
            child: isLoading
                ? const Center(
                    child: CircularProgressIndicator(
                      color: Color(0xFF00BCD4),
                    ),
                  )
                : filteredOrders.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: loadOrders,
                        color: const Color(0xFF00BCD4),
                        child: ListView.builder(
                          padding: const EdgeInsets.all(20),
                          itemCount: filteredOrders.length,
                          itemBuilder: (context, index) {
                            final order = filteredOrders[index];
                            return OrderCard(
                              order: order,
                              onStatusTap: () => _showQuickActions(order),
                              getStatusText: _getStatusText,
                              getStatusColor: _getStatusColor,
                              onUpdateStatus: (newStatus) {
                                _updateOrderStatus(order.id.toString(), newStatus);
                              },
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreateOrderDialog,
        backgroundColor: const Color(0xFF00BCD4),
        elevation: 4,
        icon: const Icon(Icons.add, color: Colors.white, size: 20),
        label: const Text(
          'Nouvelle Commande',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w600,
          ),
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(50),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: const Color(0xFFF5F7FA),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.receipt_long_outlined,
                size: 48,
                color: Colors.grey[400],
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Aucune commande trouvée',
              style: TextStyle(
                fontSize: 20,
                color: Color(0xFF1A1A1A),
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _currentFilter == 'Toutes' 
                  ? 'Commencez par créer votre première commande'
                  : 'Aucune commande avec ce filtre',
              style: const TextStyle(
                color: Color(0xFF64748B),
                fontSize: 14,
              ),
              textAlign: TextAlign.center,
            ),
            if (_currentFilter == 'Toutes') ...[
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _showCreateOrderDialog,
                icon: const Icon(Icons.add, size: 18),
                label: const Text(
                  'Créer une commande',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF00BCD4),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class OrderCard extends StatelessWidget {
  final Order order;
  final VoidCallback onStatusTap;
  final String Function(String) getStatusText;
  final Color Function(String) getStatusColor;
  final Function(String)? onUpdateStatus;

  const OrderCard({
    Key? key,
    required this.order,
    required this.onStatusTap,
    required this.getStatusText,
    required this.getStatusColor,
    this.onUpdateStatus,
  }) : super(key: key);

  // 🆕 GETTER POUR LA COULEUR DU STATUT
  Color get statusColor {
    switch (order.status) {
      case 'livree':
        return const Color(0xFF4CAF50);
      case 'annulee':
        return const Color(0xFFEF5350);
      case 'reportee':
        return const Color(0xFFFF9800);
      default:
        return const Color(0xFF00BCD4);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
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
            // En-tête avec numéro de commande et statut
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 🆕 MODIFIÉ: Utilise customOrderNumber au lieu de id
                    Text(
                      '${order.customOrderNumber}', // 🆕 CHANGEMENT ICI
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1A1A1A),
                      ),
                    ),
                    const SizedBox(height: 6),
                    // Badge Shopify
                    if (order.isShopifyOrder)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFF9800).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.store,
                              size: 12,
                              color: Colors.orange[700],
                            ),
                            const SizedBox(width: 4),
                            Text(
                              order.shopifyOrderNumber ?? 'Shopify',
                              style: TextStyle(
                                fontSize: 10,
                                color: Colors.orange[700],
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
                GestureDetector(
                  onTap: onStatusTap,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: getStatusColor(order.status).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Text(
                      getStatusText(order.status),
                      style: TextStyle(
                        color: getStatusColor(order.status),
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Informations client
            _buildInfoRow(Icons.person_outline, order.clientName),
            const SizedBox(height: 8),
            _buildInfoRow(Icons.phone_iphone, order.clientPhone),
            const SizedBox(height: 8),
            _buildInfoRow(Icons.location_on_outlined, order.clientAddress),
            
            const SizedBox(height: 16),
            
            // Montant et date
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${order.totalAmount} FCFA',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF00BCD4),
                  ),
                ),
                Text(
                  _formatDate(order.createdAt),
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF64748B),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            
            // Actions rapides
            const SizedBox(height: 16),
            _buildQuickActions(context),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String text) {
    return Row(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: const Color(0xFFF5F7FA),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, size: 16, color: const Color(0xFF64748B)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              fontSize: 14,
              color: Color(0xFF1A1A1A),
              fontWeight: FontWeight.w500,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _buildActionButton(
            'Livrée',
            const Color(0xFF4CAF50),
            Icons.check,
            'livree',
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _buildActionButton(
            'Annulée',
            const Color(0xFFEF5350),
            Icons.close,
            'annulee',
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _buildActionButton(
            'Reportée',
            const Color(0xFFFF9800),
            Icons.schedule,
            'reportee',
          ),
        ),
      ],
    );
  }

  Widget _buildActionButton(
    String label,
    Color color,
    IconData icon,
    String status,
  ) {
    return TextButton.icon(
      icon: Icon(icon, size: 16, color: color),
      label: Text(
        label,
        style: TextStyle(
          fontSize: 12, 
          color: color, 
          fontWeight: FontWeight.w600
        ),
      ),
      onPressed: () {
        onUpdateStatus?.call(status);
      },
      style: TextButton.styleFrom(
        backgroundColor: color.withOpacity(0.1),
        padding: const EdgeInsets.symmetric(vertical: 10),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year} ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }
}

class CreateOrderDialog extends StatefulWidget {
  final VoidCallback onOrderCreated;

  const CreateOrderDialog({Key? key, required this.onOrderCreated}) : super(key: key);

  @override
  CreateOrderDialogState createState() => CreateOrderDialogState();
}

class CreateOrderDialogState extends State<CreateOrderDialog> {
  final _formKey = GlobalKey<FormState>();
  final _clientNameController = TextEditingController();
  final _clientPhoneController = TextEditingController();
  final _clientAddressController = TextEditingController();
  final _notesController = TextEditingController();

  List<Product> products = [];
  List<Map<String, dynamic>> selectedProducts = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    loadProducts();
  }

  Future<void> loadProducts() async {
    try {
      final productsData = await ApiService.getProducts();
      setState(() {
        products = productsData;
      });
    } catch (e) {
      debugPrint('Erreur chargement produits: $e');
    }
  }

  void _addProduct(Product product) {
    setState(() {
      final existingIndex = selectedProducts.indexWhere(
        (p) => p['productId'] == product.id,
      );

      if (existingIndex >= 0) {
        selectedProducts[existingIndex]['quantity']++;
      } else {
        selectedProducts.add({
          'productId': product.id,
          'productName': product.name,
          'unitPrice': product.price,
          'quantity': 1,
        });
      }
    });
  }

  void _removeProduct(int index) {
    setState(() {
      selectedProducts.removeAt(index);
    });
  }

  void _updateQuantity(int index, int newQuantity) {
    if (newQuantity > 0) {
      setState(() {
        selectedProducts[index]['quantity'] = newQuantity;
      });
    }
  }

  double get totalAmount {
    return selectedProducts.fold(0.0, (sum, item) {
      return sum + (item['unitPrice'] * item['quantity']);
    });
  }

  Future<void> _createOrder() async {
    if (_formKey.currentState!.validate() && selectedProducts.isNotEmpty) {
      setState(() {
        _isLoading = true;
      });

      try {
        final orderData = {
          'clientName': _clientNameController.text,
          'clientPhone': _clientPhoneController.text,
          'clientAddress': _clientAddressController.text,
          'status': 'dashboard',
          'totalAmount': totalAmount,
          'notes': _notesController.text,
          'items': selectedProducts,
        };

        await ApiService.createOrder(orderData);
        
        if (mounted) {
          Navigator.of(context).pop();
          widget.onOrderCreated();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Commande créée avec succès !'),
              backgroundColor: Color(0xFF4CAF50),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Erreur: $e'),
              backgroundColor: const Color(0xFFEF5350),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          );
        }
      } finally {
        if (mounted) {
          setState(() {
            _isLoading = false;
          });
        }
      }
    } else if (selectedProducts.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
         SnackBar(
          content: Text('Veuillez ajouter au moins un produit'),
          backgroundColor: Color(0xFFFF9800),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Créer une Commande',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1A1A1A),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 20),
                      onPressed: () => Navigator.of(context).pop(),
                      color: const Color(0xFF64748B),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                const Text(
                  'Remplissez les informations pour créer une nouvelle commande',
                  style: TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 24),
                
                // Informations Client
                const Text(
                  'Informations Client',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1A1A1A),
                  ),
                ),
                const SizedBox(height: 16),
                
                TextFormField(
                  controller: _clientNameController,
                  decoration: const InputDecoration(
                    labelText: 'Nom du client *',
                    border: OutlineInputBorder(
                      borderSide: BorderSide(color: Color(0xFFE8ECF4)),
                      borderRadius: BorderRadius.all(Radius.circular(12)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderSide: BorderSide(color: Color(0xFF00BCD4)),
                      borderRadius: BorderRadius.all(Radius.circular(12)),
                    ),
                    floatingLabelStyle: TextStyle(color: Color(0xFF00BCD4)),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Veuillez entrer le nom du client';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                
                TextFormField(
                  controller: _clientPhoneController,
                  decoration: const InputDecoration(
                    labelText: 'Téléphone *',
                    border: OutlineInputBorder(
                      borderSide: BorderSide(color: Color(0xFFE8ECF4)),
                      borderRadius: BorderRadius.all(Radius.circular(12)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderSide: BorderSide(color: Color(0xFF00BCD4)),
                      borderRadius: BorderRadius.all(Radius.circular(12)),
                    ),
                    floatingLabelStyle: TextStyle(color: Color(0xFF00BCD4)),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Veuillez entrer le téléphone';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                
                TextFormField(
                  controller: _clientAddressController,
                  decoration: const InputDecoration(
                    labelText: 'Adresse de livraison *',
                    border: OutlineInputBorder(
                      borderSide: BorderSide(color: Color(0xFFE8ECF4)),
                      borderRadius: BorderRadius.all(Radius.circular(12)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderSide: BorderSide(color: Color(0xFF00BCD4)),
                      borderRadius: BorderRadius.all(Radius.circular(12)),
                    ),
                    floatingLabelStyle: TextStyle(color: Color(0xFF00BCD4)),
                  ),
                  maxLines: 2,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Veuillez entrer l\'adresse';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                
                TextFormField(
                  controller: _notesController,
                  decoration: const InputDecoration(
                    labelText: 'Notes (optionnel)',
                    border: OutlineInputBorder(
                      borderSide: BorderSide(color: Color(0xFFE8ECF4)),
                      borderRadius: BorderRadius.all(Radius.circular(12)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderSide: BorderSide(color: Color(0xFF00BCD4)),
                      borderRadius: BorderRadius.all(Radius.circular(12)),
                    ),
                    floatingLabelStyle: TextStyle(color: Color(0xFF00BCD4)),
                  ),
                  maxLines: 2,
                ),
                
                const SizedBox(height: 24),
                const Text(
                  'Produits',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1A1A1A),
                  ),
                ),
                const SizedBox(height: 16),
                
                Container(
                  height: 150,
                  decoration: BoxDecoration(
                    border: Border.all(color: const Color(0xFFE8ECF4)),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: products.isEmpty
                      ? const Center(
                          child: CircularProgressIndicator(
                            color: Color(0xFF00BCD4),
                          ),
                        )
                      : ListView.builder(
                          itemCount: products.length,
                          itemBuilder: (context, index) {
                            final product = products[index];
                            return ListTile(
                              leading: Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF00BCD4).withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Icon(
                                  Icons.shopping_bag,
                                  color: const Color(0xFF00BCD4),
                                  size: 20,
                                ),
                              ),
                              title: Text(
                                product.name,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w500,
                                  color: Color(0xFF1A1A1A),
                                ),
                              ),
                              subtitle: Text(
                                '${product.price} FCFA - Stock: ${product.stock}',
                                style: const TextStyle(
                                  color: Color(0xFF64748B),
                                  fontSize: 12,
                                ),
                              ),
                              trailing: IconButton(
                                icon: Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: product.stock > 0 
                                        ? const Color(0xFF4CAF50) 
                                        : const Color(0xFFE8ECF4),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    Icons.add,
                                    color: product.stock > 0 ? Colors.white : const Color(0xFF64748B),
                                    size: 16,
                                  ),
                                ),
                                onPressed: product.stock > 0
                                    ? () => _addProduct(product)
                                    : null,
                              ),
                            );
                          },
                        ),
                ),
                
                const SizedBox(height: 16),
                const Text(
                  'Produits sélectionnés',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1A1A1A),
                  ),
                ),
                const SizedBox(height: 8),
                
                selectedProducts.isEmpty
                    ? Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF5F7FA),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFE8ECF4)),
                        ),
                        child: const Center(
                          child: Text(
                            'Aucun produit sélectionné',
                            style: TextStyle(color: Color(0xFF64748B)),
                          ),
                        ),
                      )
                    : Column(
                        children: selectedProducts.asMap().entries.map((entry) {
                          final index = entry.key;
                          final item = entry.value;
                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF5F7FA),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFFE8ECF4)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.check_circle, color: Color(0xFF4CAF50), size: 20),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item['productName'],
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w500,
                                          color: Color(0xFF1A1A1A),
                                        ),
                                      ),
                                      Text(
                                        '${item['unitPrice']} FCFA x ${item['quantity']}',
                                        style: const TextStyle(
                                          color: Color(0xFF64748B),
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                      icon: const Icon(Icons.remove, size: 18),
                                      onPressed: () => _updateQuantity(index, item['quantity'] - 1),
                                      color: const Color(0xFF64748B),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(6),
                                        border: Border.all(color: const Color(0xFFE8ECF4)),
                                      ),
                                      child: Text(
                                        '${item['quantity']}',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                          color: Color(0xFF1A1A1A),
                                        ),
                                      ),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.add, size: 18),
                                      onPressed: () => _updateQuantity(index, item['quantity'] + 1),
                                      color: const Color(0xFF00BCD4),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.delete_outline, size: 18),
                                      onPressed: () => _removeProduct(index),
                                      color: const Color(0xFFEF5350),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                      ),
                
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF4CAF50).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF4CAF50).withOpacity(0.2)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Total:',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF1A1A1A),
                        ),
                      ),
                      Text(
                        '$totalAmount FCFA',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF4CAF50),
                        ),
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _isLoading ? null : () => Navigator.of(context).pop(),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          side: const BorderSide(color: Color(0xFFE8ECF4)),
                        ),
                        child: const Text(
                          'Annuler',
                          style: TextStyle(
                            color: Color(0xFF64748B),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _createOrder,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF00BCD4),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text(
                                'Créer la commande',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _clientNameController.dispose();
    _clientPhoneController.dispose();
    _clientAddressController.dispose();
    _notesController.dispose();
    super.dispose();
  }
}