import 'package:flutter/material.dart';
import '../services/api_service.dart';

class ProfitabilityPage extends StatefulWidget {
  final int? ownerId;

  const ProfitabilityPage({Key? key, this.ownerId}) : super(key: key);

  @override
  State<ProfitabilityPage> createState() => _ProfitabilityPageState();
}

class _ProfitabilityPageState extends State<ProfitabilityPage> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic> _data = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await ApiService.getProductProfitability(ownerId: widget.ownerId);
      if (!mounted) return;
      setState(() {
        _data = data;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  double _number(dynamic value) => double.tryParse(value.toString()) ?? 0;

  @override
  Widget build(BuildContext context) {
    final global = Map<String, dynamic>.from(_data['global'] as Map? ?? {});
    final products = (_data['products'] as List? ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
    final estimatedProducts = (_data['estimated_products'] as List? ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Rentabilité'),
        actions: [IconButton(onPressed: _load, icon: const Icon(Icons.refresh))],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _sectionTitle('Bénéfice net global'),
                      _metricCard(
                        '${_number(global['net_profit']).toStringAsFixed(2)} €',
                        'Commandes livrées: ${global['delivered_orders'] ?? 0}',
                        Colors.teal,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'CA ${_number(global['revenue']).toStringAsFixed(2)} € - coûts produits ${_number(global['product_cost']).toStringAsFixed(2)} € - commissions ${_number(global['closer_commissions']).toStringAsFixed(2)} € - livraison ${_number(global['delivery_fees']).toStringAsFixed(2)} €',
                        style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                      ),
                      const SizedBox(height: 24),
                      _sectionTitle('Marge brute par produit'),
                      _productList(products, (item) => _number(item['gross_margin'])),
                      const SizedBox(height: 24),
                      _sectionTitle('Bénéfice net estimé par produit'),
                      const Text(
                        'Estimation: commissions et frais de livraison répartis au prorata du montant de chaque produit dans la commande.',
                        style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                      ),
                      const SizedBox(height: 8),
                      _productList(estimatedProducts, (item) => _number(item['estimated_net_profit'])),
                    ],
                  ),
                ),
    );
  }

  Widget _sectionTitle(String title) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Text(title, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w700)),
      );

  Widget _metricCard(String value, String subtitle, Color color) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(16)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(value, style: const TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text(subtitle, style: const TextStyle(color: Colors.white70)),
        ]),
      );

  Widget _productList(List<Map<String, dynamic>> items, double Function(Map<String, dynamic>) value) {
    if (items.isEmpty) {
      return const Text('Aucune commande livrée pour le moment.', style: TextStyle(color: Color(0xFF64748B)));
    }
    return Column(
      children: items.map((item) => Card(
        margin: const EdgeInsets.only(bottom: 8),
        child: ListTile(
          title: Text((item['product_name'] ?? 'Produit').toString()),
          subtitle: Text('Quantité: ${item['quantity'] ?? 0}'),
          trailing: Text('${value(item).toStringAsFixed(2)} €', style: const TextStyle(fontWeight: FontWeight.w700)),
        ),
      )).toList(),
    );
  }
}
