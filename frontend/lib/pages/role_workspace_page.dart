import 'package:flutter/material.dart';

class RoleWorkspacePage extends StatelessWidget {
  final String role;

  const RoleWorkspacePage({Key? key, required this.role}) : super(key: key);

  String get title => role == 'closer' ? 'Espace Closeur' : 'Espace Livreur';

  String get description => role == 'closer'
      ? 'Retrouve les commandes qui te sont attribuees et traite tes appels.'
      : 'Retrouve les livraisons qui te sont attribuees et mets leur statut a jour.';

  IconData get icon => role == 'closer' ? Icons.headset_mic_outlined : Icons.delivery_dining;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 64, color: const Color(0xFF00BCD4)),
            const SizedBox(height: 20),
            Text(
              title,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 10),
            Text(
              description,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Color(0xFF64748B), fontSize: 15),
            ),
            const SizedBox(height: 24),
            const Text(
              'Les outils operationnels seront disponibles dans la prochaine etape.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Color(0xFF64748B)),
            ),
          ],
        ),
      ),
    );
  }
}
