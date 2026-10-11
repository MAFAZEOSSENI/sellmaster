// pages/profile_page.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart'; // 🟢 CORRECTION : provider.dart au lieu de provider/provider.dart
import '../auth/auth_provider.dart';

class ProfilePage extends StatelessWidget {
  const ProfilePage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context); // 🟢 CORRECTION : Provider maintenant reconnu
    
    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 20),
            
            // 🆕 HEADER PERSONNALISÉ POUR LA PAGE PROFIL
            _buildProfileHeader(authProvider, context),
            
            const SizedBox(height: 32),
            
            // 🆕 CARTES DE FONCTIONNALITÉS
            _buildFeatureCards(authProvider, context),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileHeader(AuthProvider authProvider, BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          // AVATAR GRAND
          Stack(
            children: [
              Container(
                width: 70,
                height: 70,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFFEDF0FF),
                  border: Border.all(
                    color: const Color(0xFF4869F2),
                    width: 2,
                  ),
                ),
                child: authProvider.isAuthenticated && authProvider.user?['email'] != null
                    ? Center(
                        child: Text(
                          authProvider.user!['email']!.substring(0, 1).toUpperCase(),
                          style: const TextStyle(
                            color: Color(0xFF4869F2),
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      )
                    : const Icon(Icons.person_outline, size: 30, color: Color(0xFF70798A)),
              ),
              
              // BADGE DE CONNEXION
              Positioned(
                right: 0,
                bottom: 0,
                child: Container(
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    color: authProvider.isAuthenticated ? const Color(0xFF4CAF50) : const Color(0xFF70798A),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 3),
                  ),
                  child: authProvider.isAuthenticated 
                      ? const Icon(Icons.check, size: 12, color: Colors.white)
                      : const Icon(Icons.close, size: 12, color: Colors.white),
                ),
              ),
            ],
          ),
          
          const SizedBox(width: 16),
          
          // INFOS UTILISATEUR
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  authProvider.isAuthenticated 
                      ? 'Bonjour, ${authProvider.user?['email']?.split('@')[0] ?? 'Utilisateur'}'
                      : 'Bonjour, Invité',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF171A27),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  authProvider.isAuthenticated 
                      ? 'Connecté avec ${authProvider.user?['email']}'
                      : 'Connectez-vous pour accéder à toutes les fonctionnalités',
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF70798A),
                  ),
                ),
                if (authProvider.isAuthenticated) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE8F5E8),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${authProvider.remainingOrders} commandes restantes',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF4CAF50),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFeatureCards(AuthProvider authProvider, BuildContext context) {
    return Column(
      children: [
        // CARTE INFOS COMPTE
        if (authProvider.isAuthenticated)
          _buildFeatureCard(
            icon: Icons.person,
            title: 'Informations du compte',
            subtitle: 'Gérer vos informations personnelles',
            color: const Color(0xFF4869F2),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Gestion du compte - Bientôt disponible')),
              );
            },
          ),
        
        // CARTE ACHAT LICENCE
        _buildFeatureCard(
          icon: Icons.credit_card,
          title: 'Acheter une licence',
          subtitle: 'Obtenir plus de commandes',
          color: const Color(0xFF4CAF50),
          onTap: () {
            Navigator.pushNamed(context, '/license/purchase');
          },
        ),
        
        // CARTE SUPPORT
        _buildFeatureCard(
          icon: Icons.help,
          title: 'Support',
          subtitle: 'Obtenir de l\'aide',
          color: const Color(0xFFFF9800),
          onTap: () {
            Navigator.pushNamed(context, '/support');
          },
        ),
        
        // CARTE ADMINISTRATION (si admin)
        if (authProvider.isAuthenticated)
          _buildFeatureCard(
            icon: Icons.admin_panel_settings,
            title: 'Administration',
            subtitle: 'Gestion administrateur',
            color: const Color(0xFF9C27B0),
            onTap: () {
              Navigator.pushNamed(context, '/admin/dashboard');
            },
          ),
        
        // CARTE CONNEXION/DÉCONNEXION
        _buildFeatureCard(
          icon: authProvider.isAuthenticated ? Icons.logout : Icons.login,
          title: authProvider.isAuthenticated ? 'Déconnexion' : 'Se connecter',
          subtitle: authProvider.isAuthenticated ? 'Quitter votre session' : 'Accéder à votre compte',
          color: authProvider.isAuthenticated ? const Color(0xFFF44336) : const Color(0xFF4869F2),
          onTap: () {
            if (authProvider.isAuthenticated) {
              authProvider.logout();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Déconnexion réussie')),
              );
            } else {
              Navigator.pushNamed(context, '/auth/login');
            }
          },
        ),
      ],
    );
  }

  Widget _buildFeatureCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: color),
        ),
        title: Text(
          title,
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            color: Color(0xFF171A27),
          ),
        ),
        subtitle: Text(
          subtitle,
          style: const TextStyle(
            color: Color(0xFF70798A),
            fontSize: 12,
          ),
        ),
        trailing: const Icon(Icons.arrow_forward_ios, size: 16, color: Color(0xFF70798A)),
        onTap: onTap,
      ),
    );
  }
}