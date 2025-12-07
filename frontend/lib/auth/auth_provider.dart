import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class AuthProvider with ChangeNotifier {
  String? _token;
  Map<String, dynamic>? _user;
  bool _isLoading = true;

  // Getters
  String? get token => _token;
  Map<String, dynamic>? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _token != null;

  // ✅ CORRIGÉ : Vérification au démarrage avec SharedPreferences
  Future<void> initialize() async {
    _isLoading = true;
    notifyListeners();

    try {
      // CHARGEZ LE TOKEN DEPUIS SharedPreferences VIA AuthService
      final authService = AuthService();
      final storedToken = await authService.getToken();
      
      if (storedToken != null && storedToken.isNotEmpty) {
        _token = storedToken;
        
        // Configurez le token dans ApiService
        ApiService.setToken(_token!);
        
        // Récupérer les données utilisateur
        await _fetchUserData();
        
        if (kDebugMode) {
          print('✅ Session restaurée depuis SharedPreferences');
          print('🔑 Token chargé: ${_token!.substring(0, 20)}...');
        }
      } else {
        if (kDebugMode) {
          print('ℹ️  Aucune session précédente trouvée');
        }
      }
      
      // Simuler un petit délai pour le loading
      await Future.delayed(const Duration(milliseconds: 500));
      
    } catch (e) {
      if (kDebugMode) {
        print('❌ Erreur initialisation auth: $e');
      }
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ✅ Récupérer les données utilisateur
  Future<void> _fetchUserData() async {
    try {
      if (_token == null) return;
      
      // Vous pouvez ajouter un endpoint /api/user/me plus tard
    } catch (e) {
      if (kDebugMode) {
        print('❌ Erreur fetch user data: $e');
      }
    }
  }

  // Vérifier si l'utilisateur peut créer des commandes
  bool canCreateOrder() {
    if (_user == null) return false;
    
    if (_user!['license_key'] != null) {
      final expiry = _user!['license_expiry'] != null 
          ? DateTime.parse(_user!['license_expiry'])
          : null;
      if (expiry != null && expiry.isAfter(DateTime.now())) {
        return true;
      }
    }
    
    final orderCount = _user!['order_count'] ?? 0;
    final maxOrders = _user!['max_orders'] ?? 10;
    
    return orderCount < maxOrders;
  }

  // Obtenir le nombre de commandes restantes
  int get remainingOrders {
    if (_user == null) return 0;
    
    if (_user!['license_key'] != null) {
      final expiry = _user!['license_expiry'] != null 
          ? DateTime.parse(_user!['license_expiry'])
          : null;
      if (expiry != null && expiry.isAfter(DateTime.now())) {
        return 99999;
      }
    }
    
    final orderCount = _user!['order_count'] ?? 0;
    final maxOrders = _user!['max_orders'] ?? 10;
    
    return maxOrders - orderCount;
  }

  // ✅ CORRIGÉ : Inscription
  Future<void> register(String email, String password, String phone) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await http.post(
        Uri.parse('http://localhost:3000/api/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'email': email,
          'password': password,
          'phone': phone,
        }),
      );

      if (response.statusCode == 201) {
        final data = json.decode(response.body);
        _token = data['token'];
        _user = data['user'];
        
        // ✅ SAUVEGARDEZ DANS AuthService (SharedPreferences)
        await AuthService().saveToken(_token!);
        
        // ✅ SAUVEGARDEZ DANS ApiService
        ApiService.setToken(_token!);
        
        if (kDebugMode) {
          print('✅ Inscription réussie: ${_user!['email']}');
          print('💾 Token sauvegardé dans AuthService & ApiService');
          
          // Vérification
          final savedToken = await AuthService().getToken();
          print('🔍 Token vérifié: ${savedToken != null ? "OK" : "PROBLÈME"}');
        }
      } else {
        final error = json.decode(response.body);
        throw Exception(error['error'] ?? 'Erreur d\'inscription');
      }
    } catch (error) {
      if (kDebugMode) {
        print('❌ Erreur inscription: $error');
      }
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ✅ CORRIGÉ : Connexion
  Future<void> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await http.post(
        Uri.parse('http://localhost:3000/api/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'email': email,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        _token = data['token'];
        _user = data['user'];
        
        // ✅ SAUVEGARDEZ DANS AuthService (SharedPreferences)
        await AuthService().saveToken(_token!);
        
        // ✅ SAUVEGARDEZ DANS ApiService
        ApiService.setToken(_token!);
        
        if (kDebugMode) {
          print('✅ Connexion réussie: ${_user!['email']}');
          print('📊 Données utilisateur: $_user');
          print('💾 Token sauvegardé dans AuthService & ApiService');
          
          // Vérification
          final savedToken = await AuthService().getToken();
          print('🔍 Token vérifié: ${savedToken != null ? "OK" : "PROBLÈME"}');
          if (savedToken != null) {
            print('🔑 Token (début): ${savedToken.substring(0, 30)}...');
          }
        }
      } else {
        final error = json.decode(response.body);
        throw Exception(error['error'] ?? 'Erreur de connexion');
      }
    } catch (error) {
      if (kDebugMode) {
        print('❌ Erreur connexion: $error');
      }
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ✅ CORRIGÉ : Déconnexion
  Future<void> logout() async {
    // ✅ SUPPRIMEZ LE TOKEN DANS AuthService
    await AuthService().deleteToken();
    
    // ✅ SUPPRIMEZ LE TOKEN DANS ApiService
    ApiService.clearToken();
    
    _token = null;
    _user = null;
    _isLoading = false;
    
    notifyListeners();
    
    if (kDebugMode) {
      print('🔒 Déconnexion réussie - Token supprimé des deux services');
    }
  }

  // Mettre à jour les données utilisateur
  void updateUserData(Map<String, dynamic> newUserData) {
    _user = newUserData;
    notifyListeners();
  }

  // ✅ CORRIGÉ : Charger le token au démarrage
  Future<void> loadStoredToken(String token, Map<String, dynamic> userData) async {
    _token = token;
    _user = userData;
    
    // ✅ SAUVEGARDEZ DANS AuthService
    await AuthService().saveToken(token);
    
    // ✅ SAUVEGARDEZ DANS ApiService
    ApiService.setToken(token);
    
    _isLoading = false;
    notifyListeners();
  }
  
  // 🆕 MÉTHODE POUR DÉBOGUER
  Future<void> debugAuthState() async {
    print('\n🔍 AUTH PROVIDER DEBUG');
    print('=' * 40);
    print('🔑 Token local: ${_token != null ? "PRÉSENT" : "ABSENT"}');
    print('👤 User: $_user');
    print('🔄 isLoading: $_isLoading');
    print('🔐 isAuthenticated: $isAuthenticated');
    
    // Vérifier AuthService
    try {
      final authService = AuthService();
      final storedToken = await authService.getToken();
      print('💾 Token AuthService: ${storedToken != null ? "PRÉSENT" : "ABSENT"}');
      if (storedToken != null) {
        print('📏 Longueur: ${storedToken.length}');
        print('🔑 Début: ${storedToken.substring(0, min(30, storedToken.length))}...');
      }
    } catch (e) {
      print('❌ Erreur AuthService: $e');
    }
    
    // Vérifier ApiService
    print('⚙️  Token ApiService: ${ApiService.authToken != null ? "PRÉSENT" : "ABSENT"}');
    
    print('=' * 40 + '\n');
  }
}

// Fonction utilitaire
int min(int a, int b) => a < b ? a : b;