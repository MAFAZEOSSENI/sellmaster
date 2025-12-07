import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../services/api_service.dart';
import '../models/product.dart';

class ProductsPage extends StatefulWidget {
  const ProductsPage({Key? key}) : super(key: key);

  @override
  ProductsPageState createState() => ProductsPageState();
}

class ProductsPageState extends State<ProductsPage> {
  List<Product> products = [];
  List<Product> filteredProducts = [];
  bool isLoading = true;
  String searchQuery = '';

  @override
  void initState() {
    super.initState();
    loadProducts();
  }

  Future<void> loadProducts() async {
    try {
      final productsData = await ApiService.getProducts();
      setState(() {
        products = productsData;
        filteredProducts = productsData;
        isLoading = false;
      });
    } catch (e) {
      debugPrint('Erreur chargement produits: $e');
      setState(() {
        isLoading = false;
      });
    }
  }

  void filterProducts(String query) {
    setState(() {
      searchQuery = query;
      if (query.isEmpty) {
        filteredProducts = products;
      } else {
        filteredProducts = products.where((product) =>
          product.name.toLowerCase().contains(query.toLowerCase()) ||
          (product.description ?? '').toLowerCase().contains(query.toLowerCase())
        ).toList();
      }
    });
  }

  void _showAddProductDialog() {
    showDialog(
      context: context,
      builder: (context) => AddProductDialog(onProductAdded: loadProducts),
    );
  }

  void _showEditProductDialog(Product product) {
    showDialog(
      context: context,
      builder: (context) => EditProductDialog(
        product: product,
        onProductUpdated: loadProducts,
      ),
    );
  }

  void _showDeleteConfirmation(Product product) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.warning_amber_rounded,
                  color: Color(0xFFEF5350),
                  size: 32,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Supprimer le produit',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1A1A1A),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Êtes-vous sûr de vouloir supprimer "${product.name}" ?',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Color(0xFF64748B),
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        side: const BorderSide(color: Color(0xFFE8ECF4)),
                      ),
                      child: const Text(
                        'Annuler',
                        style: TextStyle(
                          color: Color(0xFF64748B),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.of(context).pop();
                        _deleteProduct(product);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFEF5350),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text(
                        'Supprimer',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _deleteProduct(Product product) async {
    try {
      setState(() {
        products.removeWhere((p) => p.id == product.id);
        filteredProducts = List.from(products);
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Produit "${product.name}" supprimé'),
          backgroundColor: const Color(0xFF4CAF50),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erreur: $e'),
          backgroundColor: const Color(0xFFEF5350),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        title: const Text(
          'Produits',
          style: TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 24,
            color: Color(0xFF1A1A1A),
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        toolbarHeight: 80,
        actions: [
          IconButton(
            icon: Icon(Icons.notifications_outlined, color: Colors.grey[700]),
            onPressed: () {},
          ),
          const SizedBox(width: 8),
          Container(
            width: 36,
            height: 36,
            margin: const EdgeInsets.only(right: 20),
            decoration: BoxDecoration(
              color: const Color(0xFF00BCD4),
              borderRadius: BorderRadius.circular(18),
            ),
            child: const Icon(Icons.person, color: Colors.white, size: 20),
          ),
        ],
      ),
      body: Column(
        children: [
          // Barre de recherche
          Padding(
            padding: const EdgeInsets.all(20),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Rechercher un produit...',
                prefixIcon: const Icon(Icons.search, color: Color(0xFF64748B)),
                border: OutlineInputBorder(
                  borderSide: const BorderSide(color: Color(0xFFE8ECF4)),
                  borderRadius: BorderRadius.circular(12),
                ),
                focusedBorder: OutlineInputBorder(
                  borderSide: const BorderSide(color: Color(0xFF00BCD4), width: 1),
                  borderRadius: BorderRadius.circular(12),
                ),
                contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                filled: true,
                fillColor: Colors.white,
              ),
              onChanged: filterProducts,
            ),
          ),
          // Indicateur de recherche
          if (searchQuery.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              color: const Color(0xFFF8FAFC),
              child: Row(
                children: [
                  Text(
                    '${filteredProducts.length} produit(s) trouvé(s)',
                    style: const TextStyle(
                      color: Color(0xFF64748B),
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const Spacer(),
                  GestureDetector(
                    onTap: () => filterProducts(''),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF00BCD4).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'Effacer',
                        style: TextStyle(
                          color: Color(0xFF00BCD4),
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          // Liste des produits
          Expanded(
            child: isLoading
                ? const Center(
                    child: CircularProgressIndicator(
                      color: Color(0xFF00BCD4),
                    ),
                  )
                : filteredProducts.isEmpty
                    ? _buildEmptyState()
                    : _buildProductsGrid(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddProductDialog,
        backgroundColor: const Color(0xFF00BCD4),
        elevation: 4,
        icon: const Icon(Icons.add, color: Colors.white, size: 20),
        label: const Text(
          'Nouveau Produit',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w600,
          ),
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(50),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: const Color(0xFFF5F7FA),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.inventory_2_outlined,
                size: 48,
                color: Colors.grey[400],
              ),
            ),
            const SizedBox(height: 24),
            Text(
              searchQuery.isEmpty ? 'Aucun produit' : 'Aucun produit trouvé',
              style: const TextStyle(
                fontSize: 20,
                color: Color(0xFF1A1A1A),
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              searchQuery.isEmpty 
                  ? 'Commencez par ajouter vos premiers produits'
                  : 'Essayez avec d\'autres termes de recherche',
              style: const TextStyle(
                color: Color(0xFF64748B),
                fontSize: 14,
              ),
              textAlign: TextAlign.center,
            ),
            if (searchQuery.isEmpty) ...[
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _showAddProductDialog,
                icon: const Icon(Icons.add, size: 18),
                label: const Text(
                  'Ajouter un produit',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF00BCD4),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildProductsGrid() {
    return GridView.builder(
      padding: const EdgeInsets.all(20),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
        childAspectRatio: 0.75,
      ),
      itemCount: filteredProducts.length,
      itemBuilder: (context, index) {
        final product = filteredProducts[index];
        return ProductCard(
          product: product,
          onTap: () => _showEditProductDialog(product),
          onDelete: () => _showDeleteConfirmation(product),
        );
      },
    );
  }
}

class ProductCard extends StatelessWidget {
  final Product product;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  const ProductCard({
    Key? key,
    required this.product,
    required this.onTap,
    required this.onDelete,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      onLongPress: onDelete,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE8ECF4)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image du produit
            Container(
              height: 120,
              width: double.infinity,
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                ),
                image: product.imageUrl != null && product.imageUrl!.isNotEmpty
                    ? DecorationImage(
                        image: NetworkImage('http://localhost:3000${product.imageUrl!}'),
                        fit: BoxFit.cover,
                      )
                    : null,
              ),
              child: product.imageUrl == null || product.imageUrl!.isEmpty
                  ? Center(
                      child: Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF5F7FA),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.shopping_bag,
                          color: Colors.grey[400],
                          size: 24,
                        ),
                      ),
                    )
                  : null,
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Nom du produit
                  Text(
                    product.name,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1A1A1A),
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  // Prix
                  Text(
                    '${product.price} FCFA',
                    style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFF00BCD4),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  // Stock
                  Row(
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: product.stock > 0 
                              ? const Color(0xFF4CAF50) 
                              : const Color(0xFFEF5350),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'Stock: ${product.stock}',
                        style: TextStyle(
                          fontSize: 12,
                          color: product.stock > 0 
                              ? const Color(0xFF64748B) 
                              : const Color(0xFFEF5350),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// DIALOG D'ÉDITION DE PRODUIT
class EditProductDialog extends StatefulWidget {
  final Product product;
  final VoidCallback onProductUpdated;

  const EditProductDialog({
    Key? key,
    required this.product,
    required this.onProductUpdated,
  }) : super(key: key);

  @override
  EditProductDialogState createState() => EditProductDialogState();
}

class EditProductDialogState extends State<EditProductDialog> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _priceController = TextEditingController();
  final _stockController = TextEditingController();
  final _descriptionController = TextEditingController();
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _nameController.text = widget.product.name;
    _priceController.text = widget.product.price.toString();
    _stockController.text = widget.product.stock.toString();
    _descriptionController.text = widget.product.description ?? '';
  }

  Future<void> _updateProduct() async {
    if (_formKey.currentState!.validate()) {
      setState(() {
        _isLoading = true;
      });

      try {
        widget.onProductUpdated();
        
        if (mounted) {
          Navigator.of(context).pop();
          ScaffoldMessenger.of(context).showSnackBar(
             SnackBar(
              content: Text('Produit mis à jour avec succès !'),
              backgroundColor: Color(0xFF4CAF50),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Erreur: $e'),
              backgroundColor: const Color(0xFFEF5350),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          );
        }
      } finally {
        if (mounted) {
          setState(() {
            _isLoading = false;
          });
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Modifier le Produit',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1A1A1A),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 20),
                      onPressed: () => Navigator.of(context).pop(),
                      color: const Color(0xFF64748B),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                const Text(
                  'Modifiez les informations du produit',
                  style: TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 24),
                
                TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(
                    labelText: 'Nom du produit *',
                    border: OutlineInputBorder(
                      borderSide: BorderSide(color: Color(0xFFE8ECF4)),
                      borderRadius: BorderRadius.all(Radius.circular(12)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderSide: BorderSide(color: Color(0xFF00BCD4), width: 1),
                      borderRadius: BorderRadius.all(Radius.circular(12)),
                    ),
                    floatingLabelStyle: TextStyle(color: Color(0xFF00BCD4)),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Veuillez entrer un nom';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                
                TextFormField(
                  controller: _priceController,
                  decoration: const InputDecoration(
                    labelText: 'Prix (FCFA) *',
                    border: OutlineInputBorder(
                      borderSide: BorderSide(color: Color(0xFFE8ECF4)),
                      borderRadius: BorderRadius.all(Radius.circular(12)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderSide: BorderSide(color: Color(0xFF00BCD4), width: 1),
                      borderRadius: BorderRadius.all(Radius.circular(12)),
                    ),
                    floatingLabelStyle: TextStyle(color: Color(0xFF00BCD4)),
                  ),
                  keyboardType: TextInputType.number,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Veuillez entrer un prix';
                    }
                    if (double.tryParse(value) == null) {
                      return 'Prix invalide';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                
                TextFormField(
                  controller: _stockController,
                  decoration: const InputDecoration(
                    labelText: 'Stock *',
                    border: OutlineInputBorder(
                      borderSide: BorderSide(color: Color(0xFFE8ECF4)),
                      borderRadius: BorderRadius.all(Radius.circular(12)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderSide: BorderSide(color: Color(0xFF00BCD4), width: 1),
                      borderRadius: BorderRadius.all(Radius.circular(12)),
                    ),
                    floatingLabelStyle: TextStyle(color: Color(0xFF00BCD4)),
                  ),
                  keyboardType: TextInputType.number,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Veuillez entrer le stock';
                    }
                    if (int.tryParse(value) == null) {
                      return 'Stock invalide';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                
                TextFormField(
                  controller: _descriptionController,
                  decoration: const InputDecoration(
                    labelText: 'Description (optionnel)',
                    border: OutlineInputBorder(
                      borderSide: BorderSide(color: Color(0xFFE8ECF4)),
                      borderRadius: BorderRadius.all(Radius.circular(12)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderSide: BorderSide(color: Color(0xFF00BCD4), width: 1),
                      borderRadius: BorderRadius.all(Radius.circular(12)),
                    ),
                    floatingLabelStyle: TextStyle(color: Color(0xFF00BCD4)),
                  ),
                  maxLines: 3,
                ),
                
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _isLoading ? null : () => Navigator.of(context).pop(),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          side: const BorderSide(color: Color(0xFFE8ECF4)),
                        ),
                        child: const Text(
                          'Annuler',
                          style: TextStyle(
                            color: Color(0xFF64748B),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _updateProduct,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF00BCD4),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text(
                                'Modifier',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _nameController.dispose();
    _priceController.dispose();
    _stockController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }
}

// DIALOG D'AJOUT DE PRODUIT AVEC IMAGE
class AddProductDialog extends StatefulWidget {
  final VoidCallback onProductAdded;

  const AddProductDialog({Key? key, required this.onProductAdded}) : super(key: key);

  @override
  AddProductDialogState createState() => AddProductDialogState();
}

class AddProductDialogState extends State<AddProductDialog> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _priceController = TextEditingController();
  final _stockController = TextEditingController();
  final _descriptionController = TextEditingController();
  
  File? _selectedImage;
  bool _isLoading = false;

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);
    
    if (pickedFile != null) {
      setState(() {
        _selectedImage = File(pickedFile.path);
      });
    }
  }

  Future<void> _addProduct() async {
    if (_formKey.currentState!.validate()) {
      setState(() {
        _isLoading = true;
      });

      try {
        final product = Product(
          id: 0,
          name: _nameController.text,
          description: _descriptionController.text,
          price: double.parse(_priceController.text),
          stock: int.parse(_stockController.text),
          imageUrl: null,
          createdAt: DateTime.now(),
        );

        await ApiService.addProductWithImage(product, _selectedImage);
        
        if (mounted) {
          Navigator.of(context).pop();
          widget.onProductAdded();
          ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
              content: Text('Produit ajouté avec succès !'),
              backgroundColor: Color(0xFF4CAF50),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Erreur: $e'),
              backgroundColor: const Color(0xFFEF5350),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          );
        }
      } finally {
        if (mounted) {
          setState(() {
            _isLoading = false;
          });
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Ajouter un Produit',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1A1A1A),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 20),
                      onPressed: () => Navigator.of(context).pop(),
                      color: const Color(0xFF64748B),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                const Text(
                  'Remplissez les informations du nouveau produit',
                  style: TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 24),

                // Sélection d'image
                GestureDetector(
                  onTap: _pickImage,
                  child: Container(
                    height: 150,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: const Color(0xFFE8ECF4),
                        style: BorderStyle.solid,
                        width: 2,
                      ),
                    ),
                    child: _selectedImage != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: Image.file(
                              _selectedImage!,
                              fit: BoxFit.cover,
                            ),
                          )
                        : Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                width: 48,
                                height: 48,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF5F7FA),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  Icons.camera_alt,
                                  color: Colors.grey[400],
                                  size: 24,
                                ),
                              ),
                              const SizedBox(height: 8),
                              const Text(
                                'Ajouter une image',
                                style: TextStyle(
                                  color: Color(0xFF64748B),
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
                const SizedBox(height: 20),
                
                TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(
                    labelText: 'Nom du produit *',
                    border: OutlineInputBorder(
                      borderSide: BorderSide(color: Color(0xFFE8ECF4)),
                      borderRadius: BorderRadius.all(Radius.circular(12)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderSide: BorderSide(color: Color(0xFF00BCD4), width: 1),
                      borderRadius: BorderRadius.all(Radius.circular(12)),
                    ),
                    floatingLabelStyle: TextStyle(color: Color(0xFF00BCD4)),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Veuillez entrer un nom';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                
                TextFormField(
                  controller: _priceController,
                  decoration: const InputDecoration(
                    labelText: 'Prix (FCFA) *',
                    border: OutlineInputBorder(
                      borderSide: BorderSide(color: Color(0xFFE8ECF4)),
                      borderRadius: BorderRadius.all(Radius.circular(12)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderSide: BorderSide(color: Color(0xFF00BCD4), width: 1),
                      borderRadius: BorderRadius.all(Radius.circular(12)),
                    ),
                    floatingLabelStyle: TextStyle(color: Color(0xFF00BCD4)),
                  ),
                  keyboardType: TextInputType.number,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Veuillez entrer un prix';
                    }
                    if (double.tryParse(value) == null) {
                      return 'Prix invalide';
                    }
                    return null;
                  },
                ),
                
                const SizedBox(height: 16),
                
                TextFormField(
                  controller: _stockController,
                  decoration: const InputDecoration(
                    labelText: 'Stock initial *',
                    border: OutlineInputBorder(
                      borderSide: BorderSide(color: Color(0xFFE8ECF4)),
                      borderRadius: BorderRadius.all(Radius.circular(12)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderSide: BorderSide(color: Color(0xFF00BCD4), width: 1),
                      borderRadius: BorderRadius.all(Radius.circular(12)),
                    ),
                    floatingLabelStyle: TextStyle(color: Color(0xFF00BCD4)),
                  ),
                  keyboardType: TextInputType.number,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Veuillez entrer le stock';
                    }
                    if (int.tryParse(value) == null) {
                      return 'Stock invalide';
                    }
                    return null;
                  },
                ),
                
                const SizedBox(height: 16),
                
                TextFormField(
                  controller: _descriptionController,
                  decoration: const InputDecoration(
                    labelText: 'Description (optionnel)',
                    border: OutlineInputBorder(
                      borderSide: BorderSide(color: Color(0xFFE8ECF4)),
                      borderRadius: BorderRadius.all(Radius.circular(12)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderSide: BorderSide(color: Color(0xFF00BCD4), width: 1),
                      borderRadius: BorderRadius.all(Radius.circular(12)),
                    ),
                    floatingLabelStyle: TextStyle(color: Color(0xFF00BCD4)),
                  ),
                  maxLines: 3,
                ),
                
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _isLoading ? null : () => Navigator.of(context).pop(),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          side: const BorderSide(color: Color(0xFFE8ECF4)),
                        ),
                        child: const Text(
                          'Annuler',
                          style: TextStyle(
                            color: Color(0xFF64748B),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _addProduct,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF00BCD4),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text(
                                'Ajouter',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _nameController.dispose();
    _priceController.dispose();
    _stockController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }
}