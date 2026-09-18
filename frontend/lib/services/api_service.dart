import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import '../models/product.dart';
import '../models/order.dart';
import 'auth_service.dart';

class ApiService {
  static const String baseUrl = 'https://sellmaster-1.onrender.com/api';
  
  // 🆕 TOKEN STATIQUE ACCESSIBLE PARTOUT
  static String? _authToken;

  // 🆕 SETTER POUR LE TOKEN (UTILISE AuthService COMME SOURCE DE VÉRITÉ)
  static void setToken(String token) {
    _authToken = token;
    print('🔐 Token défini dans ApiService: ${token.substring(0, 20)}...');
  }

  // 🆕 GETTER POUR LE TOKEN
  static String? get authToken => _authToken;

  // 🆕 SUPPRIMER LE TOKEN
  static void clearToken() {
    _authToken = null;
    print('🔐 Token supprimé de ApiService');
  }

  // 🆕 CONSTRUCTION DES HEADERS (UTILISE AuthService SI _authToken EST NULL)
  static Future<Map<String, String>> _getHeaders() async {
    final headers = {
      'Content-Type': 'application/json',
    };
    
    // Essayer d'abord le token statique
    if (_authToken != null && _authToken!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $_authToken';
      print('🔐 Headers avec token statique ApiService');
      return headers;
    }
    
    // Si pas de token statique, vérifier AuthService
    try {
      final authService = AuthService();
      final token = await authService.getToken();
      
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
        // Mettre à jour le token statique pour les prochains appels
        _authToken = token;
        print('🔐 Headers avec token depuis AuthService');
      } else {
        print('⚠️  Headers sans token - Utilisateur non connecté');
      }
    } catch (e) {
      print('❌ Erreur récupération token AuthService: $e');
    }
    
    return headers;
  }

  // 🆕 MÉTHODE PUBLIQUE POUR LES HEADERS
  static Future<Map<String, String>> getAuthHeaders() async {
    return await _getHeaders();
  }

  // ==================== PRODUITS ====================

  static Future<List<Product>> getProducts() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/products'),
        headers: await _getHeaders(),
      );
      
      if (response.statusCode == 200) {
        List<dynamic> data = json.decode(response.body);
        return data.map((json) => Product.fromJson(json)).toList();
      } else {
        throw Exception('Erreur chargement produits: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Erreur getProducts: $e');
      rethrow;
    }
  }

  static Future<void> addProduct(Product product) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/products'),
        headers: await _getHeaders(),
        body: json.encode({
          'name': product.name,
          'description': product.description ?? '',
          'price': product.price,
          'stock': product.stock,
        }),
      );

      if (response.statusCode != 201) {
        throw Exception('Erreur ajout produit: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Erreur addProduct: $e');
      rethrow;
    }
  }

  static Future<void> updateProduct(String productId, Map<String, dynamic> productData) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/products/$productId'),
        headers: await _getHeaders(),
        body: json.encode(productData),
      );

      if (response.statusCode != 200) {
        throw Exception('Erreur mise à jour produit: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Erreur updateProduct: $e');
      rethrow;
    }
  }

  static Future<void> deleteProduct(String productId) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/products/$productId'),
        headers: await _getHeaders(),
      );

      if (response.statusCode != 200) {
        throw Exception('Erreur suppression produit: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Erreur deleteProduct: $e');
      rethrow;
    }
  }

  // ==================== COMMANDES ====================

  static Future<List<Order>> getOrders() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/orders'),
        headers: await _getHeaders(),
      );
      
      if (response.statusCode == 200) {
        List<dynamic> data = json.decode(response.body);
        return data.map((json) => Order.fromJson(json)).toList();
      } else {
        throw Exception('Erreur chargement commandes: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Erreur getOrders: $e');
      rethrow;
    }
  }

  static Future<void> createOrder(Map<String, dynamic> orderData) async {
    try {
      print('📦 Tentative création commande...');
      
      final response = await http.post(
        Uri.parse('$baseUrl/orders'),
        headers: await _getHeaders(),
        body: json.encode(orderData),
      );

      if (response.statusCode == 201) {
        print('✅ Commande créée avec succès!');
        return;
      } else {
        final errorBody = json.decode(response.body);
        final errorMessage = errorBody['error'] ?? 'Erreur inconnue';
        final errorDetails = errorBody['details'] ?? '';
        
        print('❌ Erreur API: $errorMessage - $errorDetails');
        
        if (response.statusCode == 403) {
          throw Exception('$errorMessage: $errorDetails');
        } else if (response.statusCode == 401) {
          throw Exception('Session expirée. Veuillez vous reconnecter.');
        } else {
          throw Exception('Erreur création commande: $errorMessage');
        }
      }
    } catch (e) {
      print('❌ Erreur createOrder: $e');
      rethrow;
    }
  }

  static Future<void> updateOrderStatus(String orderId, String status) async {
    try {
      final response = await http.patch(
        Uri.parse('$baseUrl/orders/$orderId/status'),
        headers: await _getHeaders(),
        body: json.encode({'status': status}),
      );

      if (response.statusCode != 200) {
        throw Exception('Erreur mise à jour statut: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Erreur updateOrderStatus: $e');
      rethrow;
    }
  }

  static Future<void> assignOrder(String orderId, {int? userId, String? note}) async {
    try {
      final body = <String, dynamic>{};
      if (userId != null) {
        body['user_id'] = userId;
      }
      if (note != null && note.isNotEmpty) {
        body['assignment_note'] = note;
      }

      final response = await http.patch(
        Uri.parse('$baseUrl/orders/$orderId/assign'),
        headers: await _getHeaders(),
        body: json.encode(body),
      );

      if (response.statusCode != 200) {
        throw Exception('Erreur attribution commande: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Erreur assignOrder: $e');
      rethrow;
    }
  }

  // ==================== STATISTIQUES ====================

  static Future<Map<String, dynamic>> getDashboardStats() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/orders/stats/dashboard'),
        headers: await _getHeaders(),
      );
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Erreur chargement statistiques: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Erreur getDashboardStats: $e');
      rethrow;
    }
  }

  // ==================== LICENCES ====================

  static Future<Map<String, dynamic>> getLicenseStatus() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/licenses/status'),
        headers: await _getHeaders(),
      );
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Erreur statut licence: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Erreur getLicenseStatus: $e');
      rethrow;
    }
  }

  static Future<Map<String, dynamic>> generateTestLicense(String type) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/licenses/test/generate'),
        headers: await _getHeaders(),
        body: json.encode({'type': type}),
      );
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Erreur génération licence: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Erreur generateTestLicense: $e');
      rethrow;
    }
  }

  // ==================== UPLOAD ====================

  static Future<String> uploadImage(XFile imageFile) async {
    try {
      final imageBytes = await imageFile.readAsBytes();
      final request = http.MultipartRequest('POST', Uri.parse('$baseUrl/upload'));

      final headers = await _getHeaders();
      if (headers.containsKey('Authorization')) {
        request.headers['Authorization'] = headers['Authorization']!;
      }

      request.files.add(
        http.MultipartFile.fromBytes(
          'image',
          imageBytes,
          filename: imageFile.name,
        ),
      );

      final response = await request.send();
      if (response.statusCode == 200) {
        final responseData = await response.stream.bytesToString();
        final jsonResponse = json.decode(responseData);
        return jsonResponse['imageUrl'];
      } else {
        throw Exception('Erreur upload image: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Erreur uploadImage: $e');
      rethrow;
    }
  }

  static Future<void> addProductWithImage(Product product, XFile? imageFile) async {
    try {
      await addProduct(product);
    } catch (e) {
      throw Exception('Erreur création produit avec image: $e');
    }
  }

  static Future<Map<String, dynamic>> getOrderNumberStats() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/orders/number-stats'),
        headers: await _getHeaders(),
      );
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Erreur récupération stats numérotation: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Erreur getOrderNumberStats: $e');
      rethrow;
    }
  }

  static Future<Map<String, dynamic>> findOrderByCustomNumber(String customNumber) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/orders/custom/$customNumber'),
        headers: await _getHeaders(),
      );
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Commande non trouvée: $customNumber');
      }
    } catch (e) {
      print('❌ Erreur findOrderByCustomNumber: $e');
      rethrow;
    }
  }
}