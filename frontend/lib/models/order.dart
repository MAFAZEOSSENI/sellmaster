import 'dart:convert';
import 'package:flutter/material.dart';

enum OrderSource { manual, shopify }

class Order {
  final int id;
  final String customOrderNumber;
  final String clientName;
  final String clientPhone;
  final String clientAddress;
  final String status;
  final double totalAmount;
  final DateTime createdAt;
  final OrderSource source;
  final String? shopifyOrderId;
  final Map<String, dynamic>? shopifyData;

  const Order({
    required this.id,
    required this.customOrderNumber,
    required this.clientName,
    required this.clientPhone,
    required this.clientAddress,
    required this.status,
    required this.totalAmount,
    required this.createdAt,
    this.source = OrderSource.manual,
    this.shopifyOrderId,
    this.shopifyData,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    final sourceString = json['source'];
    final shopifyOrderId = json['shopify_order_id'];
    final shopifyData = json['shopify_data'];
    
    return Order(
      id: json['id'] as int,
      customOrderNumber: json['custom_order_number'] as String? ?? 'CMD-${json['id']}',
      clientName: json['client_name'] as String,
      clientPhone: json['client_phone'] as String? ?? '',
      clientAddress: json['client_address'] as String? ?? '',
      status: json['status'] as String? ?? 'dashboard',
      totalAmount: _parseDouble(json['total_amount']),
      createdAt: DateTime.parse(json['created_at'] as String),
      source: sourceString == 'shopify' 
          ? OrderSource.shopify 
          : OrderSource.manual,
      shopifyOrderId: shopifyOrderId != null ? shopifyOrderId.toString() : null,
      shopifyData: _parseShopifyData(shopifyData),
    );
  }

  static double _parseDouble(dynamic value) {
    if (value == null) return 0.0;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  static Map<String, dynamic>? _parseShopifyData(dynamic data) {
    if (data == null) return null;
    if (data is Map<String, dynamic>) return data;
    if (data is String) {
      try {
        return jsonDecode(data) as Map<String, dynamic>;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  bool get isShopifyOrder => source == OrderSource.shopify;
  
  String? get shopifyOrderNumber {
    if (shopifyData?['order_number'] != null) {
      return '#${shopifyData!['order_number']}';
    }
    return shopifyOrderId != null ? 'Shopify $shopifyOrderId' : null;
  }

  String get formattedOrderNumber => customOrderNumber;

  String get shortOrderNumber {
    final regex = RegExp(r'USR\d+-');
    return customOrderNumber.replaceFirst(regex, '');
  }

  String get statusText {
    switch (status) {
      case 'livree':
        return 'Livrée';
      case 'annulee':
        return 'Annulée';
      case 'reportee':
        return 'Reportée';
      case 'dashboard':
        return 'En cours';
      default:
        return status;
    }
  }

  Color get statusColor {
    switch (status) {
      case 'livree':
        return const Color(0xFF4CAF50);
      case 'annulee':
        return const Color(0xFFEF5350);
      case 'reportee':
        return const Color(0xFFFF9800);
      default:
        return const Color(0xFF00BCD4);
    }
  }

  @override
  String toString() {
    return 'Order{id: $id, customNumber: $customOrderNumber, client: $clientName, source: $source}';
  }
}