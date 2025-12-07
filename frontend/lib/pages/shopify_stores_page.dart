import 'package:flutter/material.dart';
import '../services/shopify_service.dart';
import '../models/shopify_config.dart';
import 'shopify_connect_page.dart';

class ShopifyStoresPage extends StatefulWidget {
  const ShopifyStoresPage({Key? key}) : super(key: key);

  @override
  ShopifyStoresPageState createState() => ShopifyStoresPageState();
}

class ShopifyStoresPageState extends State<ShopifyStoresPage> {
  List<ShopifyConfig> _configs = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadConfigs();
  }

  Future<void> _loadConfigs() async {
  try {
    final stores = await ShopifyService.getStores();
    setState(() {
      // Convertir les données JSON en objets
      _configs = stores.map((store) => ShopifyConfig(
        id: store['id'] ?? 0,
        shopName: store['shop_name'] ?? store['shopName'] ?? '',
        apiKey: store['api_key'] ?? '',
        accessToken: store['access_token'] ?? '',
        isActive: (store['is_active'] ?? 1)== 1,
        connectedAt: DateTime.parse(store['connected_at'] ?? DateTime.now().toString()),
        lastSync: store['last_sync'] != null ? DateTime.parse(store['last_sync']) : null,
      )).toList();
      _isLoading = false;
    });
  } catch (e) {
    setState(() {
      _isLoading = false;
    });
    _showError('Erreur lors du chargement des boutiques: $e');
  }
}

  Future<void> _syncOrders(ShopifyConfig config) async {
  try {
    final result = await ShopifyService.syncStoreOrders(config.id.toString());
    
    if (result['success'] == true) {
      final syncedCount = result['savedCount'] ?? result['synced'] ?? 0;
      _showSuccess('${result['message'] ?? "$syncedCount commandes synchronisées"}');
      
      // Recharger la liste
      _loadConfigs();
    } else {
      _showError(result['message'] ?? 'Erreur lors de la synchronisation');
    }
  } catch (e) {
    _showError('Erreur de synchronisation: $e');
  }
}

  void _showDeleteConfirmation(ShopifyConfig config) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.warning_amber_rounded,
                  color: Color(0xFFEF5350),
                  size: 32,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Déconnecter la boutique',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1A1A1A),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Êtes-vous sûr de vouloir déconnecter "${config.shopName}" ?',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Color(0xFF64748B),
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
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
                      onPressed: () {
                        Navigator.of(context).pop();
                        _deleteConfig(config);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFEF5350),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text(
                        'Déconnecter',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
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
    );
  }

 Future<void> _deleteConfig(ShopifyConfig config) async {
  try {
    final result = await ShopifyService.deleteStore(config.id.toString());
    
    if (result['success'] == true) {
      _showSuccess(result['message'] ?? 'Boutique déconnectée');
      // Recharger la liste
      _loadConfigs();
    } else {
      _showError(result['message'] ?? 'Erreur lors de la déconnexion');
    }
  } catch (e) {
    _showError('Erreur lors de la déconnexion: $e');
  }
}

  void _showSuccess(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: const Color(0xFF4CAF50),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      );
    }
  }

  void _showError(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: const Color(0xFFEF5350),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        title: const Text(
          'Boutiques Shopify',
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
            icon: Icon(Icons.refresh, color: Colors.grey[700]),
            onPressed: _loadConfigs,
            tooltip: 'Actualiser',
          ),
          const SizedBox(width: 8),
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
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(
                color: Color(0xFF00BCD4),
              ),
            )
          : _configs.isEmpty
              ? _buildEmptyState()
              : _buildConfigsList(),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const ShopifyConnectPage()),
          ).then((_) => _loadConfigs());
        },
        backgroundColor: const Color(0xFF00BCD4),
        elevation: 4,
        icon: const Icon(Icons.add_business, color: Colors.white, size: 20),
        label: const Text(
          'Nouvelle Boutique',
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
                Icons.store_mall_directory_outlined,
                size: 48,
                color: Colors.grey[400],
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Aucune boutique Shopify connectée',
              style: TextStyle(
                fontSize: 20,
                color: Color(0xFF1A1A1A),
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Connectez votre première boutique pour synchroniser\nvos commandes et produits automatiquement',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Color(0xFF64748B),
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const ShopifyConnectPage()),
                );
              },
              icon: const Icon(Icons.add, size: 18),
              label: const Text(
                'Connecter une boutique',
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
        ),
      ),
    );
  }

  Widget _buildConfigsList() {
    return Column(
      children: [
        // En-tête
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border(
              bottom: BorderSide(color: Colors.grey.shade100),
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: const Color(0xFFE0F7FA),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.store,
                  color: Color(0xFF00BCD4),
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Boutiques connectées',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1A1A1A),
                      ),
                    ),
                    Text(
                      'Gérez vos boutiques Shopify connectées',
                      style: TextStyle(
                        color: Color(0xFF64748B),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFE0F7FA),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${_configs.length} boutique(s)',
                  style: const TextStyle(
                    color: Color(0xFF00BCD4),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
        // Liste des boutiques
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(20),
            itemCount: _configs.length,
            itemBuilder: (context, index) {
              final config = _configs[index];
              return _buildStoreCard(config);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildStoreCard(ShopifyConfig config) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE8ECF4)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: const Color(0xFFE8F5E8),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.store,
                              color: Color(0xFF4CAF50),
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              config.shopName,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF1A1A1A),
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _buildInfoRow('Connectée le', _formatDate(config.connectedAt)),
                      if (config.lastSync != null)
                        _buildInfoRow('Dernière sync', _formatDateTime(config.lastSync!)),
                      if (config.isActive)
                        Container(
                          margin: const EdgeInsets.only(top: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 6,
                                height: 6,
                                decoration: const BoxDecoration(
                                  color: Color(0xFF4CAF50),
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 6),
                              const Text(
                                'Active',
                                style: TextStyle(
                                  color: Color(0xFF4CAF50),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Actions
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _syncOrders(config),
                    icon: const Icon(Icons.sync, size: 16),
                    label: const Text(
                      'Synchroniser',
                      style: TextStyle(fontWeight: FontWeight.w500),
                    ),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      side: const BorderSide(color: Color(0xFF00BCD4)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: () => _showDeleteConfirmation(config),
                  icon: const Icon(Icons.delete_outline, size: 20),
                  color: const Color(0xFF64748B),
                  style: IconButton.styleFrom(
                    backgroundColor: const Color(0xFFF5F7FA),
                    padding: const EdgeInsets.all(12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: Colors.grey.shade300),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Text(
            '$label: ',
            style: const TextStyle(
              color: Color(0xFF64748B),
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              color: Color(0xFF1A1A1A),
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  String _formatDateTime(DateTime date) {
    return '${date.day}/${date.month}/${date.year} à ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }
}