import 'dart:convert';
import 'package:http/http.dart' as http;
import '../services/api_service.dart';
import '../models/shopify_config.dart';

class ShopifyService {
  static const String baseUrl = 'https://sellmaster-1.onrender.com/api';

  // ============================================
  // MÉTHODE UNIFIÉE : UTILISEZ ApiService.getAuthHeaders()
  // ============================================
  static Future<Map<String, String>> _getHeaders() async {
    return await ApiService.getAuthHeaders();
  }

  // ============================================
  // MÉTHODE GÉNÉRIQUE POUR REQUÊTES AUTHENTIFIÉES
  // ============================================
  static Future<http.Response> _authenticatedRequest({
    required String method,
    required String endpoint,
    Map<String, dynamic>? body,
  }) async {
    try {
      print('\n🛍️ SHOPIFY API REQUEST');
      print('🔗 $method $baseUrl/$endpoint');
      
      final headers = await _getHeaders();
      
      final url = Uri.parse('$baseUrl/$endpoint');
      
      final response = switch (method.toUpperCase()) {
        'GET' => await http.get(url, headers: headers),
        'POST' => await http.post(
            url,
            headers: headers,
            body: json.encode(body ?? {}),
          ),
        'PUT' => await http.put(
            url,
            headers: headers,
            body: json.encode(body ?? {}),
          ),
        'DELETE' => await http.delete(url, headers: headers),
        _ => throw Exception('Méthode HTTP non supportée: $method'),
      };

      print('📡 Réponse: ${response.statusCode}');
      
      return response;
    } catch (e) {
      print('❌ Erreur _authenticatedRequest: $e');
      rethrow;
    }
  }

  // ============================================
  // 1. Tester la connexion Shopify
  // ============================================
  static Future<Map<String, dynamic>> testConnection({
    required String shopName,
    required String accessToken,
  }) async {
    try {
      final response = await _authenticatedRequest(
        method: 'POST',
        endpoint: 'shopify/test-connection',
        body: {
          'shopName': shopName,
          'accessToken': accessToken,
        },
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        final errorData = json.decode(response.body);
        throw Exception(errorData['message'] ?? 'Erreur ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Erreur testConnection: $e');
      return {
        'success': false,
        'message': e.toString(),
      };
    }
  }

  // ============================================
  // 2. Configurer un nouveau store Shopify
  // ============================================
  static Future<Map<String, dynamic>> configureStore({
    required String shopName,
    required String apiKey,
    required String accessToken,
  }) async {
    try {
      final response = await _authenticatedRequest(
        method: 'POST',
        endpoint: 'shopify/stores',
        body: {
          'shopName': shopName,
          'apiKey': apiKey,
          'accessToken': accessToken,
        },
      );

      if (response.statusCode == 201) {
        final data = json.decode(response.body);
        return {
          'success': true,
          'message': data['message'] ?? 'Store Shopify configuré avec succès',
          'store': data['store'],
        };
      } else {
        final errorData = json.decode(response.body);
        throw Exception(errorData['message'] ?? 'Erreur ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Erreur configureStore: $e');
      return {
        'success': false,
        'message': e.toString(),
      };
    }
  }

  // ============================================
  // 3. Récupérer tous les stores de l'utilisateur
  // ============================================
  static Future<List<dynamic>> getStores() async {
    try {
      final response = await _authenticatedRequest(
        method: 'GET',
        endpoint: 'shopify/stores',
      );
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        
        // Le backend retourne {success: true, count: X, stores: []}
        if (data['success'] == true && data['stores'] is List) {
          return data['stores'];
        }
        return [];
      } else if (response.statusCode == 404) {
        throw Exception('Endpoint non trouvé. Vérifiez le backend.');
      } else {
        final errorData = json.decode(response.body);
        throw Exception(errorData['message'] ?? 'Erreur ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Erreur getStores: $e');
      rethrow;
    }
  }

  // ============================================
  // 4. Synchroniser les commandes d'un store
  // ============================================
  static Future<Map<String, dynamic>> syncStoreOrders(String storeId) async {
    try {
      final response = await _authenticatedRequest(
        method: 'GET',
        endpoint: 'shopify/stores/$storeId/orders/sync',
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        final errorData = json.decode(response.body);
        throw Exception(errorData['message'] ?? 'Erreur ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Erreur syncStoreOrders: $e');
      return {
        'success': false,
        'message': e.toString(),
      };
    }
  }

  static Future<Map<String, dynamic>> syncStoreProducts(String storeId) async {
    try {
      final response = await _authenticatedRequest(
        method: 'GET',
        endpoint: 'shopify/stores/$storeId/products/sync',
      );
      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
      final errorData = json.decode(response.body);
      throw Exception(errorData['message'] ?? 'Erreur ${response.statusCode}');
    } catch (e) {
      print('❌ Erreur syncStoreProducts: $e');
      return {'success': false, 'message': e.toString()};
    }
  }

  // ============================================
  // 5. Supprimer un store
  // ============================================
  static Future<Map<String, dynamic>> deleteStore(String storeId) async {
    try {
      final response = await _authenticatedRequest(
        method: 'DELETE',
        endpoint: 'shopify/stores/$storeId',
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {
          'success': true,
          'message': data['message'] ?? 'Store supprimé avec succès',
        };
      } else {
        final errorData = json.decode(response.body);
        throw Exception(errorData['message'] ?? 'Erreur ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Erreur deleteStore: $e');
      return {
        'success': false,
        'message': e.toString(),
      };
    }
  }

  // ============================================
  // 6. Obtenir les statistiques de synchronisation
  // ============================================
  static Future<Map<String, dynamic>> getSyncStats(String storeId) async {
    try {
      final response = await _authenticatedRequest(
        method: 'GET',
        endpoint: 'shopify/stores/$storeId/stats',
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        final errorData = json.decode(response.body);
        throw Exception(errorData['message'] ?? 'Erreur ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Erreur getSyncStats: $e');
      return {
        'success': false,
        'message': e.toString(),
      };
    }
  }
}