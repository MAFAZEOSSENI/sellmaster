class Product {
  final int id;
  final String name;
  final String? description;
  final double price;
  final double? costPrice;
  final int stock;
  final String? imageUrl;
  final DateTime createdAt;

  const Product({ // const ajouté
    required this.id,
    required this.name,
    this.description,
    required this.price,
    this.costPrice,
    required this.stock,
    this.imageUrl,
    required this.createdAt,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      price: double.parse(json['price'].toString()),
      costPrice: json['cost_price'] == null ? null : double.tryParse(json['cost_price'].toString()),
      stock: json['stock'],
      imageUrl: json['image_url'],
      createdAt: DateTime.parse(json['created_at']),
    );
  }
}