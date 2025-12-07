class Product {
  final int id;
  final String name;
  final String? description;
  final double price;
  final int stock;
  final String? imageUrl;
  final DateTime createdAt;

  const Product({ // const ajouté
    required this.id,
    required this.name,
    this.description,
    required this.price,
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
      stock: json['stock'],
      imageUrl: json['image_url'],
      createdAt: DateTime.parse(json['created_at']),
    );
  }
}