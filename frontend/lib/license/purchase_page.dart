import 'package:flutter/material.dart';

class PurchaseLicensePage extends StatelessWidget {
  const PurchaseLicensePage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Acheter une Licence'),
      ),
      body: const Center(
        child: Text('Page d\'achat de licence - À implémenter'),
      ),
    );
  }
}