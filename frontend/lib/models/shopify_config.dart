class ShopifyConfig {
  final int id;
  final String shopName;
  final String apiKey;
  final String accessToken;
  final bool isActive;
  final DateTime connectedAt;
  final DateTime? lastSync;

  const ShopifyConfig({
    required this.id,
    required this.shopName,
    required this.apiKey,
    required this.accessToken,
    required this.isActive,
    required this.connectedAt,
    this.lastSync,
  });

  factory ShopifyConfig.fromJson(Map<String, dynamic> json) {
    return ShopifyConfig(
      id: json['id'] as int,
      shopName: json['shop_name'] as String,
      apiKey: json['api_key'] as String,
      accessToken: json['access_token'] as String,
      isActive: _parseBool(json['is_active']), // ← CORRECTION ICI
      connectedAt: DateTime.parse(json['connected_at'] as String),
      lastSync: json['last_sync'] != null 
          ? DateTime.parse(json['last_sync'] as String) 
          : null,
    );
  }

  // Méthode pour parser bool depuis int/string/bool
  static bool _parseBool(dynamic value) {
    if (value == null) return true;
    if (value is bool) return value;
    if (value is int) return value == 1;
    if (value is String) {
      return value.toLowerCase() == 'true' || value == '1';
    }
    return true;
  }

  Map<String, dynamic> toJson() {
    return {
      'shopName': shopName,
      'apiKey': apiKey,
      'accessToken': accessToken,
    };
  }
}