import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';

class ShopifyConnectPage extends StatefulWidget {
  const ShopifyConnectPage({Key? key}) : super(key: key);

  @override
  State<ShopifyConnectPage> createState() => _ShopifyConnectPageState();
}

class _ShopifyConnectPageState extends State<ShopifyConnectPage> {
  final _shopController = TextEditingController();
  bool _isLoading = false;
  String? _error;

  Future<void> _connect() async {
    final shop = _shopController.text.trim().toLowerCase();
    if (!RegExp(r'^[a-z0-9][a-z0-9-]*$').hasMatch(shop)) {
      setState(() => _error = 'Entre uniquement le nom de ta boutique Shopify.');
      return;
    }

    final token = ApiService.authToken;
    if (token == null || token.isEmpty) {
      setState(() => _error = 'Ta session Sellmaster a expiré. Reconnecte-toi.');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final response = await http.get(
        Uri.https('sellmaster-1.onrender.com', '/api/shopify/auth/start', {'shop': shop}),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (response.statusCode != 200) {
        throw Exception(json.decode(response.body)['error'] ?? 'Erreur Shopify');
      }
      final url = json.decode(response.body)['url'] as String;
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    } catch (error) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = 'Impossible de démarrer la connexion Shopify: $error';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        title: const Text('Connecter Shopify'),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1A1A1A),
        elevation: 0,
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: Card(
            margin: const EdgeInsets.all(24),
            child: Padding(
              padding: const EdgeInsets.all(28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.storefront, color: Color(0xFF00BCD4), size: 52),
                  const SizedBox(height: 20),
                  const Text(
                    'Connecte ta boutique Shopify',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Tu seras redirige vers Shopify pour autoriser Sellmaster. Aucun token ou mot de passe ne sera demande ici.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 24),
                  TextField(
                    controller: _shopController,
                    enabled: !_isLoading,
                    decoration: const InputDecoration(
                      labelText: 'Nom de la boutique',
                      hintText: 'ma-boutique',
                      suffixText: '.myshopify.com',
                      border: OutlineInputBorder(),
                    ),
                    onSubmitted: (_) => _connect(),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(_error!, style: const TextStyle(color: Colors.red)),
                  ],
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: _isLoading ? null : _connect,
                    icon: _isLoading
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.login),
                    label: const Text('Continuer avec Shopify'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00BCD4),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _shopController.dispose();
    super.dispose();
  }
}
