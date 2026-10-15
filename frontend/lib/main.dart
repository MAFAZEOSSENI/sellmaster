import 'dart:async';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:app_links/app_links.dart';
import 'pages/dashboard_page.dart';
import 'pages/products_page.dart';
import 'pages/orders_page.dart';
import 'pages/shopify_stores_page.dart';
import 'pages/profile_page.dart';
import 'pages/profitability_page.dart';
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
  const bool useLocalApi =
      bool.fromEnvironment('USE_LOCAL_API', defaultValue: false);
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
  runApp(MyApp(
      initialLink: initialLink, notificationService: notificationService));
}

class MyApp extends StatefulWidget {
  final Uri? initialLink;
  final NotificationService notificationService;

  const MyApp({Key? key, this.initialLink, required this.notificationService})
      : super(key: key);

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  static final GlobalKey<NavigatorState> _navigatorKey =
      GlobalKey<NavigatorState>();
  StreamSubscription<Uri>? _linkSubscription;
  String? _initialConnectedStore;

  @override
  void initState() {
    super.initState();
    _initialConnectedStore =
        _storeFromDeepLink(widget.initialLink) ?? _storeFromWebCallback();
    if (!kIsWeb) {
      _linkSubscription = AppLinks().uriLinkStream.listen(_handleDeepLink);
    }
  }

  String? _storeFromDeepLink(Uri? uri) {
    if (uri?.scheme != 'sellmaster' || uri?.host != 'shopify-connected')
      return null;
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
          textTheme:
              GoogleFonts.interTextTheme(ThemeData.light().textTheme).copyWith(
            headlineLarge: GoogleFonts.poppins(
              fontSize: 36,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF171A27),
            ),
            headlineMedium: GoogleFonts.poppins(
              fontSize: 28,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF171A27),
            ),
            titleLarge: GoogleFonts.poppins(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: const Color(0xFF252B3B),
            ),
            bodyMedium: GoogleFonts.inter(
              fontSize: 14,
              color: const Color(0xFF70798A),
            ),
          ),
          primaryColor: const Color(0xFF4869F2),
          scaffoldBackgroundColor: const Color(0xFFF6F7FB),
          colorScheme: const ColorScheme.light(
            primary: Color(0xFF4869F2),
            secondary: Color(0xFF3959DF),
            surface: Colors.white,
            onPrimary: Colors.white,
            onSurface: Color(0xFF171A27),
            outline: Color(0xFFE3E7F0),
            error: Color(0xFFA43C2E),
          ),
          appBarTheme: const AppBarTheme(
            backgroundColor: Colors.white,
            foregroundColor: Color(0xFF171A27),
            elevation: 0,
            centerTitle: false,
            titleTextStyle: TextStyle(
              color: Color(0xFF171A27),
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
          cardTheme: CardTheme(
            color: Colors.white,
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
              side: const BorderSide(color: Color(0xFFE3E7F0), width: 1),
            ),
          ),
          inputDecorationTheme: InputDecorationTheme(
            filled: true,
            fillColor: Colors.white,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: Color(0xFFD9DEEB)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: Color(0xFFD9DEEB)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: Color(0xFF4869F2), width: 2),
            ),
            labelStyle: const TextStyle(color: Color(0xFF4D636D)),
          ),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF4869F2),
              foregroundColor: Colors.white,
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(7),
              ),
              textStyle: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 15,
              ),
            ),
          ),
          bottomNavigationBarTheme: const BottomNavigationBarThemeData(
            type: BottomNavigationBarType.fixed,
            backgroundColor: Color(0xFF171A29),
            selectedItemColor: Color(0xFFAAB9FF),
            unselectedItemColor: Color(0xFF9AA3C1),
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
                      color: Color(0xFF70798A),
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

class _MainDestination {
  final String id;
  final String label;
  final IconData icon;
  final IconData selectedIcon;
  final Widget page;

  const _MainDestination({
    required this.id,
    required this.label,
    required this.icon,
    required this.selectedIcon,
    required this.page,
  });
}

class MainNavigationPage extends StatefulWidget {
  const MainNavigationPage({Key? key}) : super(key: key);

  @override
  MainNavigationPageState createState() => MainNavigationPageState();
}

class MainNavigationPageState extends State<MainNavigationPage> {
  int _currentIndex = 0;

  List<_MainDestination> _destinationsForRole(String role) {
    if (role == 'courier') {
      return [
        _MainDestination(
            id: 'workspace',
            label: 'Espace',
            icon: Icons.work_outline,
            selectedIcon: Icons.work,
            page: RoleWorkspacePage(role: role)),
        const _MainDestination(
            id: 'orders',
            label: 'Commandes',
            icon: Icons.receipt_long_outlined,
            selectedIcon: Icons.receipt_long,
            page: OrdersPage()),
        const _MainDestination(
            id: 'profile',
            label: 'Profil',
            icon: Icons.person_outline,
            selectedIcon: Icons.person,
            page: ProfilePage()),
      ];
    }

    if (role == 'closer') {
      return [
        _MainDestination(
            id: 'workspace',
            label: 'Espace',
            icon: Icons.work_outline,
            selectedIcon: Icons.work,
            page: RoleWorkspacePage(role: role)),
        const _MainDestination(
            id: 'orders',
            label: 'Commandes',
            icon: Icons.receipt_long_outlined,
            selectedIcon: Icons.receipt_long,
            page: OrdersPage()),
        const _MainDestination(
            id: 'products',
            label: 'Produits',
            icon: Icons.inventory_2_outlined,
            selectedIcon: Icons.inventory_2,
            page: ProductsPage()),
        const _MainDestination(
            id: 'profile',
            label: 'Profil',
            icon: Icons.person_outline,
            selectedIcon: Icons.person,
            page: ProfilePage()),
      ];
    }

    return [
      const _MainDestination(
          id: 'overview',
          label: 'Accueil',
          icon: Icons.home_outlined,
          selectedIcon: Icons.home,
          page: DashboardPage()),
      const _MainDestination(
          id: 'orders',
          label: 'Commandes',
          icon: Icons.receipt_long_outlined,
          selectedIcon: Icons.receipt_long,
          page: OrdersPage()),
      const _MainDestination(
          id: 'products',
          label: 'Produits',
          icon: Icons.inventory_2_outlined,
          selectedIcon: Icons.inventory_2,
          page: ProductsPage()),
      const _MainDestination(
          id: 'team',
          label: 'Équipe',
          icon: Icons.groups_outlined,
          selectedIcon: Icons.groups,
          page: AdminDashboardPage()),
      _MainDestination(
          id: 'more',
          label: 'Plus',
          icon: Icons.more_horiz,
          selectedIcon: Icons.more_horiz,
          page: MorePage(role: role)),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final destinations = _destinationsForRole(authProvider.primaryRole);
    final selectedIndex = _currentIndex.clamp(0, destinations.length - 1);

    return Scaffold(
      appBar: _buildAppBar(authProvider, context),
      body: LayoutBuilder(
        builder: (context, constraints) {
          if (constraints.maxWidth >= 840) {
            return Row(
              children: [
                NavigationRail(
                  selectedIndex: selectedIndex,
                  labelType: NavigationRailLabelType.all,
                  backgroundColor: Colors.white,
                  indicatorColor: const Color(0xFFEDF0FF),
                  selectedIconTheme:
                      const IconThemeData(color: Color(0xFF4869F2)),
                  selectedLabelTextStyle: const TextStyle(
                      color: Color(0xFF3959DF), fontWeight: FontWeight.w700),
                  unselectedIconTheme:
                      const IconThemeData(color: Color(0xFF70798A)),
                  unselectedLabelTextStyle:
                      const TextStyle(color: Color(0xFF70798A)),
                  onDestinationSelected: (index) =>
                      setState(() => _currentIndex = index),
                  destinations: destinations
                      .map((destination) => NavigationRailDestination(
                            icon: Icon(destination.icon),
                            selectedIcon: Icon(destination.selectedIcon),
                            label: Text(destination.label),
                          ))
                      .toList(),
                ),
                const VerticalDivider(
                    width: 1, thickness: 1, color: Color(0xFFE3E7F0)),
                Expanded(
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 220),
                    child: KeyedSubtree(
                      key: ValueKey(destinations[selectedIndex].id),
                      child: destinations[selectedIndex].page,
                    ),
                  ),
                ),
              ],
            );
          }

          return AnimatedSwitcher(
            duration: const Duration(milliseconds: 220),
            child: KeyedSubtree(
              key: ValueKey(destinations[selectedIndex].id),
              child: destinations[selectedIndex].page,
            ),
          );
        },
      ),
      bottomNavigationBar: MediaQuery.sizeOf(context).width < 840
          ? _buildBottomNavigationBar(destinations, selectedIndex)
          : null,
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

  PreferredSizeWidget _buildAppBar(
      AuthProvider authProvider, BuildContext context) {
    return AppBar(
      backgroundColor: Colors.white,
      elevation: 0,
      automaticallyImplyLeading: false,
      title: Row(
        children: [
          Image.asset(
            'assets/sellmaster-mark.png',
            width: 32,
            height: 32,
            fit: BoxFit.contain,
          ),
          const SizedBox(width: 10),
          Flexible(
            child: Text(
              _destinationsForRole(authProvider.primaryRole)[
                      _currentIndex.clamp(
                          0,
                          _destinationsForRole(authProvider.primaryRole)
                                  .length -
                              1)]
                  .label,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  color: Color(0xFF171A27),
                  fontSize: 16,
                  fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
      centerTitle: false,
      actions: [
        Padding(
          padding: const EdgeInsets.only(top: 12, bottom: 12, right: 8),
          child: Chip(
            label: Text(
              _roleLabel(authProvider.primaryRole),
              style: const TextStyle(fontSize: 11, color: Color(0xFF3959DF)),
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
                color: const Color(0xFFF6F7FB),
              ),
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  IconButton(
                    icon: const Icon(Icons.notifications_outlined,
                        color: Color(0xFF171A27)),
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
                          notifications.unreadCount > 9
                              ? '9+'
                              : notifications.unreadCount.toString(),
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
                    _currentIndex =
                        _destinationsForRole(authProvider.primaryRole)
                            .indexWhere((item) => item.id == 'profile');
                    if (_currentIndex < 0)
                      _currentIndex =
                          _destinationsForRole(authProvider.primaryRole)
                              .indexWhere((item) => item.id == 'more');
                  });
                },
                child: CircleAvatar(
                  radius: 18,
                  backgroundColor: const Color(0xFFEDF0FF),
                  child: authProvider.isAuthenticated &&
                          authProvider.user?['email'] != null
                      ? Text(
                          authProvider.user!['email']!
                              .substring(0, 1)
                              .toUpperCase(),
                          style: const TextStyle(
                            color: Color(0xFF4869F2),
                            fontWeight: FontWeight.bold,
                          ),
                        )
                      : const Icon(Icons.person_outline,
                          size: 18, color: Color(0xFF70798A)),
                ),
              ),
              Positioned(
                right: 0,
                bottom: 0,
                child: Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: authProvider.isAuthenticated
                        ? const Color(0xFF4CAF50)
                        : const Color(0xFF70798A),
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

  Widget _buildBottomNavigationBar(
      List<_MainDestination> destinations, int selectedIndex) {
    return NavigationBar(
      height: 68,
      backgroundColor: Colors.white,
      indicatorColor: const Color(0xFFEDF0FF),
      selectedIndex: selectedIndex,
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      onDestinationSelected: (index) => setState(() => _currentIndex = index),
      destinations: destinations
          .map((destination) => NavigationDestination(
                icon: Icon(destination.icon),
                selectedIcon: Icon(destination.selectedIcon),
                label: destination.label,
              ))
          .toList(),
    );
  }
}

class MorePage extends StatelessWidget {
  final String role;

  const MorePage({super.key, required this.role});

  void _open(BuildContext context, Widget page) {
    Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => page));
  }

  @override
  Widget build(BuildContext context) {
    final isOwner = role == 'owner';
    final canManageShopify = role == 'owner' || role == 'manager';
    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      appBar: AppBar(
          title: const Text('Plus'),
          backgroundColor: Colors.white,
          elevation: 0),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
        children: [
          if (canManageShopify)
            _MoreDestinationTile(
              icon: Icons.storefront_outlined,
              title: 'Boutiques Shopify',
              subtitle: 'Synchronisation et connexions',
              onTap: () => _open(context, const ShopifyStoresPage()),
            ),
          if (isOwner)
            _MoreDestinationTile(
              icon: Icons.analytics_outlined,
              title: 'Rentabilité',
              subtitle: 'Analyse des revenus et des coûts',
              onTap: () => _open(context, const ProfitabilityPage()),
            ),
          _MoreDestinationTile(
            icon: Icons.person_outline,
            title: 'Profil',
            subtitle: 'Compte, licence et préférences',
            onTap: () => _open(context, const ProfilePage()),
          ),
          _MoreDestinationTile(
            icon: Icons.help_outline,
            title: 'Support',
            subtitle: 'Centre d’aide Sellmaster',
            onTap: () => _open(context, const SupportPage()),
          ),
        ],
      ),
    );
  }
}

class _MoreDestinationTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _MoreDestinationTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: const BorderSide(color: Color(0xFFE3E7F0)),
      ),
      child: ListTile(
        minLeadingWidth: 44,
        leading: CircleAvatar(
          backgroundColor: const Color(0xFFEDF0FF),
          foregroundColor: const Color(0xFF4869F2),
          child: Icon(icon),
        ),
        title: Text(title,
            style: const TextStyle(
                fontWeight: FontWeight.w700, color: Color(0xFF171A27))),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right, color: Color(0xFF70798A)),
        onTap: onTap,
      ),
    );
  }
}
