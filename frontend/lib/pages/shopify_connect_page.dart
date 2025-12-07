import 'package:flutter/material.dart';
import '../services/shopify_service.dart';
import '../models/shopify_config.dart';

class ShopifyConnectPage extends StatefulWidget {
  const ShopifyConnectPage({Key? key}) : super(key: key);

  @override
  ShopifyConnectPageState createState() => ShopifyConnectPageState();
}

class ShopifyConnectPageState extends State<ShopifyConnectPage> {
  final _formKey = GlobalKey<FormState>();
  final _shopNameController = TextEditingController();
  final _apiKeyController = TextEditingController();
  final _accessTokenController = TextEditingController();

  bool _isLoading = false;
  String _message = '';
  bool _isSuccess = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        title: const Text(
          'Connecter Shopify',
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
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // En-tête
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE8ECF4)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE0F7FA),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.store,
                        color: Color(0xFF00BCD4),
                        size: 24,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Configuration Shopify',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1A1A1A),
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Connectez votre boutique Shopify pour synchroniser automatiquement vos commandes et produits',
                      style: TextStyle(
                        color: Color(0xFF64748B),
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // Nom de la boutique
              const Text(
                'Nom de la boutique',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1A1A1A),
                ),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _shopNameController,
                decoration: const InputDecoration(
                  hintText: 'ex: ma-boutique (sans .myshopify.com)',
                  border: OutlineInputBorder(
                    borderSide: BorderSide(color: Color(0xFFE8ECF4)),
                    borderRadius: BorderRadius.all(Radius.circular(12)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: Color(0xFF00BCD4), width: 1),
                    borderRadius: BorderRadius.all(Radius.circular(12)),
                  ),
                  prefixIcon: Icon(Icons.store, color: Color(0xFF64748B)),
                  floatingLabelStyle: TextStyle(color: Color(0xFF00BCD4)),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Veuillez entrer le nom de votre boutique';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 20),

              // Clé API
              const Text(
                'Clé API',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1A1A1A),
                ),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _apiKeyController,
                decoration: const InputDecoration(
                  hintText: 'Votre clé API Shopify',
                  border: OutlineInputBorder(
                    borderSide: BorderSide(color: Color(0xFFE8ECF4)),
                    borderRadius: BorderRadius.all(Radius.circular(12)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: Color(0xFF00BCD4), width: 1),
                    borderRadius: BorderRadius.all(Radius.circular(12)),
                  ),
                  prefixIcon: Icon(Icons.vpn_key, color: Color(0xFF64748B)),
                  floatingLabelStyle: TextStyle(color: Color(0xFF00BCD4)),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Veuillez entrer la clé API';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 20),

              // Jeton d'accès
              const Text(
                'Jeton d\'accès',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1A1A1A),
                ),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _accessTokenController,
                decoration: const InputDecoration(
                  hintText: 'Votre jeton d\'accès Shopify',
                  border: OutlineInputBorder(
                    borderSide: BorderSide(color: Color(0xFFE8ECF4)),
                    borderRadius: BorderRadius.all(Radius.circular(12)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: Color(0xFF00BCD4), width: 1),
                    borderRadius: BorderRadius.all(Radius.circular(12)),
                  ),
                  prefixIcon: Icon(Icons.security, color: Color(0xFF64748B)),
                  floatingLabelStyle: TextStyle(color: Color(0xFF00BCD4)),
                ),
                obscureText: true,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Veuillez entrer le jeton d\'accès';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 32),

              // Instructions
              _buildInstructions(),
              const SizedBox(height: 32),

              // Message de résultat
              if (_message.isNotEmpty)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: _isSuccess 
                        ? const Color(0xFFE8F5E8) 
                        : const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _isSuccess 
                          ? const Color(0xFF4CAF50) 
                          : const Color(0xFFEF5350),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _isSuccess ? Icons.check_circle : Icons.error_outline,
                        color: _isSuccess 
                            ? const Color(0xFF4CAF50) 
                            : const Color(0xFFEF5350),
                        size: 24,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _message,
                          style: TextStyle(
                            color: _isSuccess 
                                ? const Color(0xFF2E7D32) 
                                : const Color(0xFFC62828),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              if (_message.isNotEmpty) const SizedBox(height: 20),

              // Bouton de connexion
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _connectShopify,
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
                      : const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.link, size: 20, color: Colors.white),
                            SizedBox(width: 8),
                            Text(
                              'Connecter la boutique',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                ),
              ),
              const SizedBox(height: 8),
              const Center(
                child: Text(
                  'Assurez-vous que votre boutique Shopify est active',
                  style: TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInstructions() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFE0F7FA),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF00BCD4).withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: const Color(0xFF00BCD4),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.help_outline,
                  color: Colors.white,
                  size: 18,
                ),
              ),
              const SizedBox(width: 12),
              const Text(
                'Comment obtenir ces informations ?',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF00BCD4),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildInstructionStep(
            '1. Allez dans Shopify Admin',
            'Paramètres → Applications et vendeurs → Applications',
          ),
          const SizedBox(height: 12),
          _buildInstructionStep(
            '2. Créez une nouvelle application',
            'Nommez-la "COMPTA Connector"',
          ),
          const SizedBox(height: 12),
          _buildInstructionStep(
            '3. Configurez les permissions',
            'read_orders, read_products, read_customers',
          ),
          const SizedBox(height: 12),
          _buildInstructionStep(
            '4. Installez l\'application',
            'Copiez le jeton d\'accès après l\'installation',
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF8E1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFFFC107).withOpacity(0.3)),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.info_outline,
                  color: const Color(0xFFFFC107),
                  size: 16,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Assurez-vous que les permissions sont correctement configurées pour permettre la synchronisation',
                    style: TextStyle(
                      color: const Color(0xFFFFC107).withOpacity(0.9),
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInstructionStep(String title, String subtitle) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 24,
          height: 24,
          decoration: BoxDecoration(
            color: const Color(0xFF00BCD4).withOpacity(0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(
            Icons.check,
            color: const Color(0xFF00BCD4),
            size: 14,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1A1A1A),
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: const TextStyle(
                  color: Color(0xFF64748B),
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _connectShopify() async {
    if (_formKey.currentState!.validate()) {
      setState(() {
        _isLoading = true;
        _message = '';
      });

      try {
        // Test de connexion d'abord
        final testResult = await ShopifyService.testConnection(
          shopName: _shopNameController.text,
          accessToken: _accessTokenController.text,
        );

        if (testResult['success'] == true) {
          // Sauvegarde de la configuration
          final config = ShopifyConfig(
            id: 0,
            shopName: _shopNameController.text,
            apiKey: _apiKeyController.text,
            accessToken: _accessTokenController.text,
            isActive: true,
            connectedAt: DateTime.now(),
          );

         final saveResult = await ShopifyService.configureStore(
  shopName: _shopNameController.text,
  apiKey: _apiKeyController.text,
  accessToken: _accessTokenController.text,
);

          setState(() {
            _isSuccess = saveResult['success'] == true;
            _message = saveResult['message'] ?? 
              (_isSuccess 
                ? 'Boutique Shopify connectée avec succès ! Synchronisation des données en cours...' 
                : 'Erreur lors de la sauvegarde de la configuration');
          });

          if (_isSuccess) {
            // Redirection après succès
            Future.delayed(const Duration(seconds: 2), () {
              Navigator.of(context).pop(true);
            });
          }
        } else {
          setState(() {
            _isSuccess = false;
            _message = testResult['message'] ?? 'Échec de la connexion avec Shopify. Vérifiez vos identifiants.';
          });
        }
      } catch (e) {
        setState(() {
          _isSuccess = false;
          _message = 'Erreur de connexion: $e';
        });
      } finally {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _shopNameController.dispose();
    _apiKeyController.dispose();
    _accessTokenController.dispose();
    super.dispose();
  }
}