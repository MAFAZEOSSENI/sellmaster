import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

class ShopifyConnectedPage extends StatelessWidget {
  final String store;

  const ShopifyConnectedPage({Key? key, required this.store}) : super(key: key);

  String get _deepLink => Uri(
        scheme: 'sellmaster',
        host: 'shopify-connected',
        queryParameters: {'store': store},
      ).toString();

  @override
  Widget build(BuildContext context) {
    final displayStore = store.isEmpty ? 'votre boutique Shopify' : store;
    return Scaffold(
      backgroundColor: const Color(0xFFF3F7F7),
      appBar: AppBar(
        title: const Text('Boutique connectée'),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF183139),
        elevation: 0,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Container(
              padding: const EdgeInsets.all(28),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFDCE6E5)),
                boxShadow: const [
                  BoxShadow(color: Color(0x12163A3D), blurRadius: 36, offset: Offset(0, 12)),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 58,
                    height: 58,
                    decoration: const BoxDecoration(color: Color(0xFFE5F5EC), shape: BoxShape.circle),
                    child: const Icon(Icons.check_rounded, color: Color(0xFF157347), size: 34),
                  ),
                  const SizedBox(height: 18),
                  const Text(
                    'Shopify est connecté',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 25, fontWeight: FontWeight.w800, color: Color(0xFF183139)),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    displayStore,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 15, color: Color(0xFF64777C)),
                  ),
                  const SizedBox(height: 22),
                  const Text(
                    'Pour ouvrir directement cette boutique dans l’application Sellmaster, scannez ce QR code avec votre téléphone.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 14, height: 1.45, color: Color(0xFF52666B)),
                  ),
                  const SizedBox(height: 18),
                  QrImageView(
                    data: _deepLink,
                    version: QrVersions.auto,
                    size: 220,
                    backgroundColor: Colors.white,
                    semanticsLabel: 'Lien Sellmaster pour $displayStore',
                  ),
                  const SizedBox(height: 14),
                  SelectableText(
                    _deepLink,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 12, color: Color(0xFF087F83)),
                  ),
                  const SizedBox(height: 18),
                  OutlinedButton.icon(
                    onPressed: () => Navigator.of(context).maybePop(),
                    icon: const Icon(Icons.arrow_back),
                    label: const Text('Continuer dans Sellmaster'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
