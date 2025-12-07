import 'package:flutter/material.dart';
import '../models/order.dart';

class OrderNumberBadge extends StatelessWidget {
  final Order order;
  final bool showFullNumber;

  const OrderNumberBadge({
    Key? key,
    required this.order,
    this.showFullNumber = true,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
      
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.receipt_long,
            size: 16,
            color: Colors.white,
          ),
          const SizedBox(width: 6),
          Text(
            showFullNumber ? order.formattedOrderNumber : order.shortOrderNumber,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}