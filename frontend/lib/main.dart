import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'pages/dashboard_page.dart';
import 'pages/products_page.dart';
import 'pages/orders_page.dart';
import 'pages/shopify_stores_page.dart';
import 'pages/profile_page.dart';
import 'auth/login_page.dart';
import 'auth/register_page.dart';
import 'license/purchase_page.dart';
import 'license/activation_page.dart';
import 'admin/admin_dashboard.dart';
import 'support/support_page.dart';
import 'auth/auth_provider.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (context) => AuthProvider()..initialize(),
        ),
      ],
      child: MaterialApp(
        title: 'Gestion Commandes',
        theme: ThemeData(
          primarySwatch: Colors.cyan,
          scaffoldBackgroundColor: const Color(0xFFF5F7FA),
          bottomNavigationBarTheme: const BottomNavigationBarThemeData(
            type: BottomNavigationBarType.fixed,
            backgroundColor: Colors.white,
            selectedItemColor: Color(0xFF00BCD4),
            unselectedItemColor: Color(0xFF64748B),
          ),
        ),
        debugShowCheckedModeBanner: false,
        home: const AuthWrapper(),
        routes: {
          '/auth/login': (context) => const LoginPage(),
          '/auth/register': (context) => const RegisterPage(),
          '/license/purchase': (context) => const PurchaseLicensePage(),
          '/license/activate': (context) => const ActivationPage(),
          '/admin/dashboard': (context) => const AdminDashboardPage(),
          '/support': (context) => const SupportPage(),
        },
      ),
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, child) {
        // ✅ Afficher loading pendant la vérification initiale
        if (auth.isLoading) {
          return const Scaffold(
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text(
                    'Vérification de la session...',
                    style: TextStyle(
                      color: Color(0xFF64748B),
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ),
          );
        }

        // ✅ Rediriger vers login si pas authentifié
        if (!auth.isAuthenticated) {
          return const LoginPage();
        }

        // ✅ Seulement aller au dashboard si authentifié
        return const MainNavigationPage();
      },
    );
  }
}

class MainNavigationPage extends StatefulWidget {
  const MainNavigationPage({Key? key}) : super(key: key);

  @override
  MainNavigationPageState createState() => MainNavigationPageState();
}

class MainNavigationPageState extends State<MainNavigationPage> {
  int _currentIndex = 0;

  final List<Widget> _pages = [
    const DashboardPage(),
    const ProductsPage(),
    const OrdersPage(),
    const ShopifyStoresPage(),
    const ProfilePage(),
  ];

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    
    return Scaffold(
      appBar: _buildAppBar(authProvider, context),
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 300),
        child: _pages[_currentIndex],
      ),
      bottomNavigationBar: _buildBottomNavigationBar(),
    );
  }

  PreferredSizeWidget _buildAppBar(AuthProvider authProvider, BuildContext context) {
    return AppBar(
      backgroundColor: Colors.white,
      elevation: 0,
      automaticallyImplyLeading: false,
      title: _buildTimeWidget(),
      centerTitle: true,
      actions: [
        Container(
          margin: const EdgeInsets.only(right: 8, top: 8),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: const Color(0xFFF5F7FA),
          ),
          child: IconButton(
            icon: const Icon(Icons.notifications_outlined, color: Color(0xFF1A1A1A)),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Notifications - Bientôt disponible')),
              );
            },
          ),
        ),
        
        Container(
          margin: const EdgeInsets.only(right: 16, top: 8, bottom: 8),
          child: Stack(
            children: [
              GestureDetector(
                onTap: () {
                  setState(() {
                    _currentIndex = 4;
                  });
                },
                child: CircleAvatar(
                  radius: 18,
                  backgroundColor: const Color(0xFFE0F7FA),
                  child: authProvider.isAuthenticated && authProvider.user?['email'] != null
                      ? Text(
                          authProvider.user!['email']!.substring(0, 1).toUpperCase(),
                          style: const TextStyle(
                            color: Color(0xFF00BCD4),
                            fontWeight: FontWeight.bold,
                          ),
                        )
                      : const Icon(Icons.person_outline, size: 18, color: Color(0xFF64748B)),
                ),
              ),
              
              Positioned(
                right: 0,
                bottom: 0,
                child: Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: authProvider.isAuthenticated ? const Color(0xFF4CAF50) : const Color(0xFF64748B),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTimeWidget() {
    return StreamBuilder(
      stream: Stream.periodic(const Duration(seconds: 60)),
      builder: (context, snapshot) {
        final now = DateTime.now();
        final timeString = '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
        return Text(
          timeString,
          style: const TextStyle(
            color: Color(0xFF1A1A1A),
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        );
      },
    );
  }

  Widget _buildBottomNavigationBar() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
        border: Border(
          top: BorderSide(
            color: const Color(0xFFE8ECF4),
            width: 1,
          ),
        ),
      ),
      child: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        backgroundColor: Colors.white,
        selectedItemColor: const Color(0xFF00BCD4),
        unselectedItemColor: const Color(0xFF64748B),
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        selectedLabelStyle: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w500,
        ),
        iconSize: 24,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home_outlined),
            activeIcon: Icon(Icons.home),
            label: 'Accueil',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.inventory_2_outlined),
            activeIcon: Icon(Icons.inventory_2),
            label: 'Produits',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.receipt_long_outlined),
            activeIcon: Icon(Icons.receipt_long),
            label: 'Commandes',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.storefront_outlined),
            activeIcon: Icon(Icons.storefront),
            label: 'Shopify',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: 'Profil',
          ),
        ],
      ),
    );
  }
}