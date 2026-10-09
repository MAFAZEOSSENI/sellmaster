import 'dart:async';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:provider/provider.dart';
import 'package:app_links/app_links.dart';
import 'pages/dashboard_page.dart';
import 'pages/products_page.dart';
import 'pages/orders_page.dart';
import 'pages/shopify_stores_page.dart';
import 'pages/profile_page.dart';
import 'pages/role_workspace_page.dart';
import 'auth/login_page.dart';
import 'auth/register_page.dart';
import 'license/purchase_page.dart';
import 'license/activation_page.dart';
import 'admin/admin_dashboard.dart';
import 'support/support_page.dart';
import 'auth/auth_provider.dart';
import 'services/api_service.dart';
import 'services/notification_service.dart';
import 'services/fcm_service.dart';
import 'firebase_options.dart';
import 'pages/shopify_connected_page.dart';
import 'pages/notifications_page.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  const bool useLocalApi = bool.fromEnvironment('USE_LOCAL_API', defaultValue: false);
  ApiService.setEnvironment(useLocal: useLocalApi);

  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  final notificationService = NotificationService();
  await FcmService().initialize(notificationService);

  Uri? initialLink;
  if (!kIsWeb) {
    try {
      initialLink = await AppLinks().getInitialLink();
    } catch (_) {
      initialLink = null;
    }
  }
  runApp(MyApp(initialLink: initialLink, notificationService: notificationService));
}

class MyApp extends StatefulWidget {
  final Uri? initialLink;
  final NotificationService notificationService;

  const MyApp({Key? key, this.initialLink, required this.notificationService}) : super(key: key);

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  static final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();
  StreamSubscription<Uri>? _linkSubscription;
  String? _initialConnectedStore;

  @override
  void initState() {
    super.initState();
    _initialConnectedStore = _storeFromDeepLink(widget.initialLink) ?? _storeFromWebCallback();
    if (!kIsWeb) {
      _linkSubscription = AppLinks().uriLinkStream.listen(_handleDeepLink);
    }
  }

  String? _storeFromDeepLink(Uri? uri) {
    if (uri?.scheme != 'sellmaster' || uri?.host != 'shopify-connected') return null;
    return uri?.queryParameters['store'] ?? '';
  }

  String? _storeFromWebCallback() {
    if (!kIsWeb) return null;
    final uri = Uri.base;
    if (uri.queryParameters['shopify'] != 'connected') return null;
    return uri.queryParameters['store'] ?? '';
  }

  void _handleDeepLink(Uri uri) {
    final store = _storeFromDeepLink(uri);
    if (store == null) return;
    final navigator = _navigatorKey.currentState;
    if (navigator == null) {
      setState(() => _initialConnectedStore = store);
      return;
    }
    navigator.pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => ShopifyConnectedPage(store: store)),
      (_) => false,
    );
  }

  @override
  void dispose() {
    _linkSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (context) => AuthProvider()..initialize(),
        ),
        ChangeNotifierProvider(
          create: (context) => widget.notificationService,
        ),
      ],
      child: MaterialApp(
        navigatorKey: _navigatorKey,
        title: 'Sellmaster',
        theme: ThemeData(
          useMaterial3: true,
          fontFamily: 'Inter',
          primaryColor: const Color(0xFF0F8A8D),
          scaffoldBackgroundColor: const Color(0xFFF4FBFA),
          colorScheme: const ColorScheme.light(
            primary: Color(0xFF0F8A8D),
            secondary: Color(0xFF0A6469),
            surface: Colors.white,
            onPrimary: Colors.white,
            onSurface: Color(0xFF16313A),
          ),
          appBarTheme: const AppBarTheme(
            backgroundColor: Colors.white,
            foregroundColor: Color(0xFF16313A),
            elevation: 0,
            centerTitle: false,
            titleTextStyle: TextStyle(
              color: Color(0xFF16313A),
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
          cardTheme: CardTheme(
            color: Colors.white,
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: const BorderSide(color: Color(0xFFDDEAE7), width: 1),
            ),
          ),
          inputDecorationTheme: InputDecorationTheme(
            filled: true,
            fillColor: Colors.white,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Color(0xFFD7E5E3)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Color(0xFFD7E5E3)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Color(0xFF0F8A8D), width: 2),
            ),
            labelStyle: const TextStyle(color: Color(0xFF4D636D)),
          ),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0F8A8D),
              foregroundColor: Colors.white,
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
              textStyle: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 15,
              ),
            ),
          ),
          bottomNavigationBarTheme: const BottomNavigationBarThemeData(
            type: BottomNavigationBarType.fixed,
            backgroundColor: Colors.white,
            selectedItemColor: Color(0xFF0F8A8D),
            unselectedItemColor: Color(0xFF64748B),
            selectedLabelStyle: TextStyle(fontWeight: FontWeight.w600),
            unselectedLabelStyle: TextStyle(fontWeight: FontWeight.w500),
          ),
        ),
        debugShowCheckedModeBanner: false,
        home: _initialConnectedStore != null
          ? ShopifyConnectedPage(store: _initialConnectedStore!)
          : const AuthWrapper(),
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

        WidgetsBinding.instance.addPostFrameCallback((_) async {
          if (auth.isAuthenticated) {
            await context.read<NotificationService>().syncFromServer();
            if (context.read<NotificationService>().items.isEmpty) {
              context.read<NotificationService>().show(
                title: 'Bienvenue',
                message: 'Vos notifications s\'afficheront ici.',
                type: AppNotificationType.success,
              );
            }
          }
        });

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

  List<Widget> _pagesForRole(String role) {
    if (role == 'closer' || role == 'courier') {
      return [
        RoleWorkspacePage(role: role),
        const OrdersPage(),
        const ProfilePage(),
      ];
    }
    return [
      const DashboardPage(),
      const ProductsPage(),
      const OrdersPage(),
      const ShopifyStoresPage(),
      const ProfilePage(),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final pages = _pagesForRole(authProvider.primaryRole);
    if (_currentIndex >= pages.length) {
      _currentIndex = pages.length - 1;
    }
    
    return Scaffold(
      appBar: _buildAppBar(authProvider, context),
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 300),
        child: pages[_currentIndex],
      ),
      bottomNavigationBar: _buildBottomNavigationBar(authProvider.primaryRole),
    );
  }

  String _roleLabel(String role) {
    switch (role) {
      case 'owner':
        return 'Propriétaire';
      case 'manager':
        return 'Manager';
      case 'closer':
        return 'Closer';
      case 'courier':
        return 'Livreur';
      default:
        return 'Utilisateur';
    }
  }

  PreferredSizeWidget _buildAppBar(AuthProvider authProvider, BuildContext context) {
    return AppBar(
      backgroundColor: Colors.white,
      elevation: 0,
      automaticallyImplyLeading: false,
      title: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: const Color(0xFF0F8A8D),
              borderRadius: BorderRadius.circular(10),
            ),
            alignment: Alignment.center,
            child: const Text(
              'S',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w900,
                fontSize: 16,
              ),
            ),
          ),
          const SizedBox(width: 10),
          _buildTimeWidget(),
        ],
      ),
      centerTitle: false,
      actions: [
        Padding(
          padding: const EdgeInsets.only(top: 12, bottom: 12, right: 8),
          child: Chip(
            label: Text(
              _roleLabel(authProvider.primaryRole),
              style: const TextStyle(fontSize: 11, color: Color(0xFF0A6469)),
            ),
            backgroundColor: const Color(0xFFEAF9F7),
            side: BorderSide.none,
            visualDensity: VisualDensity.compact,
          ),
        ),
        Builder(
          builder: (context) {
            final notifications = context.watch<NotificationService>();
            return Container(
              margin: const EdgeInsets.only(right: 8, top: 8),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFF5F7FA),
              ),
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  IconButton(
                    icon: const Icon(Icons.notifications_outlined, color: Color(0xFF1A1A1A)),
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => const NotificationsPage(),
                        ),
                      );
                    },
                  ),
                  if (notifications.unreadCount > 0)
                    Positioned(
                      right: 8,
                      top: 8,
                      child: Container(
                        width: 18,
                        height: 18,
                        alignment: Alignment.center,
                        decoration: const BoxDecoration(
                          color: Color(0xFFEF4444),
                          shape: BoxShape.circle,
                        ),
                        child: Text(
                          notifications.unreadCount > 9 ? '9+' : notifications.unreadCount.toString(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            );
          },
        ),
        
        Container(
          margin: const EdgeInsets.only(right: 16, top: 8, bottom: 8),
          child: Stack(
            children: [
              GestureDetector(
                onTap: () {
                  setState(() {
                    _currentIndex = _pagesForRole(authProvider.primaryRole).length - 1;
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

  Widget _buildBottomNavigationBar(String role) {
    final isFieldRole = role == 'closer' || role == 'courier';
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
        items: isFieldRole
            ? const [
                BottomNavigationBarItem(
                  icon: Icon(Icons.work_outline),
                  activeIcon: Icon(Icons.work),
                  label: 'Espace',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.receipt_long_outlined),
                  activeIcon: Icon(Icons.receipt_long),
                  label: 'Commandes',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.person_outline),
                  activeIcon: Icon(Icons.person),
                  label: 'Profil',
                ),
              ]
            : const [
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