import 'package:flutter/material.dart';

import '../services/api_service.dart';

class ProductResearchPage extends StatefulWidget {
  const ProductResearchPage({super.key});

  @override
  State<ProductResearchPage> createState() => _ProductResearchPageState();
}

class _ProductResearchPageState extends State<ProductResearchPage> {
  final TextEditingController _urlController = TextEditingController();
  final TextEditingController _searchController = TextEditingController();
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  bool _importing = false;
  List<Map<String, dynamic>> _collections = [];
  String _error = '';

  @override
  void initState() {
    super.initState();
    _loadLibrary();
  }

  @override
  void dispose() {
    _urlController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadLibrary() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final response = await ApiService.getResearchLibrary(limit: 50);
      final items = (response['items'] as List? ?? const [])
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();
      setState(() => _items = items);
    } catch (error) {
      setState(() => _error = error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _search() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final response = await ApiService.getResearchProducts(
        q: _searchController.text.trim(),
        limit: 50,
      );
      final items = (response['items'] as List? ?? const [])
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();
      setState(() => _items = items);
    } catch (error) {
      setState(() => _error = error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _importUrl() async {
    final url = _urlController.text.trim();
    if (url.isEmpty) return;
    setState(() {
      _importing = true;
      _error = '';
    });
    try {
      await ApiService.importResearchProductUrl(url);
      _urlController.clear();
      await _search();
    } catch (error) {
      setState(() => _error = error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _importing = false);
    }
  }

  Future<void> _toggleSaved(Map<String, dynamic> item, bool saved) async {
    final id = int.tryParse(item['id']?.toString() ?? '');
    if (id == null) return;
    try {
      await ApiService.setResearchSaved(id, !saved);
      await _search();
    } catch (error) {
      setState(() => _error = error.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> _manageLibraryItem(Map<String, dynamic> item) async {
    final id = int.tryParse(item['id']?.toString() ?? '');
    if (id == null) return;
    try {
      final collectionsResponse = await ApiService.getResearchCollections();
      final notesResponse = await ApiService.getResearchNotes(id);
      if (!mounted) return;
      final collections = (collectionsResponse['collections'] as List? ?? const [])
          .whereType<Map>()
          .map((collection) => Map<String, dynamic>.from(collection))
          .toList();
      final notes = (notesResponse['notes'] as List? ?? const [])
          .whereType<Map>()
          .map((note) => Map<String, dynamic>.from(note))
          .toList();

      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        builder: (sheetContext) {
          final collectionController = TextEditingController();
          final noteController = TextEditingController();
          return Padding(
            padding: EdgeInsets.only(bottom: MediaQuery.of(sheetContext).viewInsets.bottom),
            child: SafeArea(
              child: StatefulBuilder(builder: (context, setSheetState) {
                return Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item['title']?.toString() ?? 'Produit', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 12),
                      const Text('Collections', style: TextStyle(fontWeight: FontWeight.w700)),
                      ...collections.map((collection) => ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(collection['name']?.toString() ?? 'Collection'),
                        trailing: const Icon(Icons.add),
                        onTap: () async {
                          try {
                            await ApiService.addResearchProductToCollection(int.parse(collection['id'].toString()), id);
                            if (sheetContext.mounted) Navigator.of(sheetContext).pop();
                          } catch (error) {
                            setState(() => _error = error.toString().replaceFirst('Exception: ', ''));
                          }
                        },
                      )),
                      TextField(controller: collectionController, decoration: const InputDecoration(hintText: 'Nouvelle collection')),
                      Align(alignment: Alignment.centerRight, child: TextButton(
                        onPressed: () async {
                          if (collectionController.text.trim().isEmpty) return;
                          try {
                            await ApiService.createResearchCollection(collectionController.text.trim());
                            collectionController.clear();
                            final response = await ApiService.getResearchCollections();
                            setSheetState(() {
                              collections
                                ..clear()
                                ..addAll((response['collections'] as List? ?? const [])
                                    .whereType<Map>()
                                    .map((collection) => Map<String, dynamic>.from(collection)));
                            });
                          } catch (error) {
                            setState(() => _error = error.toString().replaceFirst('Exception: ', ''));
                          }
                        },
                        child: const Text('Créer'),
                      )),
                      const Divider(),
                      const Text('Notes privées', style: TextStyle(fontWeight: FontWeight.w700)),
                      TextField(controller: noteController, maxLines: 3, decoration: const InputDecoration(hintText: 'Ajouter une note personnelle')),
                      Align(alignment: Alignment.centerRight, child: TextButton(
                        onPressed: () async {
                          if (noteController.text.trim().isEmpty) return;
                          try {
                            await ApiService.createResearchNote(id, noteController.text.trim());
                            noteController.clear();
                            final response = await ApiService.getResearchNotes(id);
                            setSheetState(() {
                              notes
                                ..clear()
                                ..addAll((response['notes'] as List? ?? const [])
                                    .whereType<Map>()
                                    .map((note) => Map<String, dynamic>.from(note)));
                            });
                          } catch (error) {
                            setState(() => _error = error.toString().replaceFirst('Exception: ', ''));
                          }
                        },
                        child: const Text('Enregistrer'),
                      )),
                      ...notes.map((note) => ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(note['body']?.toString() ?? ''),
                        trailing: IconButton(
                          icon: const Icon(Icons.delete_outline),
                          onPressed: () async {
                            final noteId = int.tryParse(note['id']?.toString() ?? '');
                            if (noteId == null) return;
                            await ApiService.deleteResearchNote(noteId);
                            final response = await ApiService.getResearchNotes(id);
                            setSheetState(() {
                              notes
                                ..clear()
                                ..addAll((response['notes'] as List? ?? const [])
                                    .whereType<Map>()
                                    .map((updated) => Map<String, dynamic>.from(updated)));
                            });
                          },
                        ),
                      )),
                    ],
                  ),
                );
              }),
            ),
          );
        },
      );
    } catch (error) {
      setState(() => _error = error.toString().replaceFirst('Exception: ', ''));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Product Research')),
      body: RefreshIndicator(
        onRefresh: _loadLibrary,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text('Analyser une fiche produit', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            TextField(
              controller: _urlController,
              keyboardType: TextInputType.url,
              decoration: const InputDecoration(
                hintText: 'https://boutique.myshopify.com/products/produit',
                prefixIcon: Icon(Icons.link),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _importing ? null : _importUrl,
                icon: _importing
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.travel_explore),
                label: Text(_importing ? 'Analyse…' : 'Analyser'),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _searchController,
              onSubmitted: (_) => _search(),
              decoration: InputDecoration(
                hintText: 'Rechercher dans les résultats',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: IconButton(onPressed: _search, icon: const Icon(Icons.arrow_forward)),
              ),
            ),
            if (_error.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(_error, style: const TextStyle(color: Colors.red)),
            ],
            const SizedBox(height: 16),
            if (_loading)
              const Center(child: CircularProgressIndicator())
            else if (_items.isEmpty)
              const Center(child: Padding(padding: EdgeInsets.all(32), child: Text('Aucun produit recherché.')))
            else
              ..._items.map((item) => Card(
                    margin: const EdgeInsets.only(bottom: 10),
                    child: ListTile(
                      leading: item['image_url'] is String
                          ? ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.network(item['image_url'], width: 52, height: 52, fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => const Icon(Icons.image_not_supported)),
                            )
                          : const Icon(Icons.inventory_2_outlined),
                      title: Text(item['title']?.toString() ?? 'Produit sans nom'),
                      subtitle: Text(item['canonical_url']?.toString() ?? 'Source inconnue'),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            tooltip: 'Collections et notes',
                            onPressed: () => _manageLibraryItem(item),
                            icon: const Icon(Icons.folder_outlined),
                          ),
                          IconButton(
                            tooltip: item['saved'] == true ? 'Retirer des favoris' : 'Ajouter aux favoris',
                            onPressed: () => _toggleSaved(item, item['saved'] == true),
                            icon: Icon(item['saved'] == true ? Icons.favorite : Icons.favorite_border),
                          ),
                        ],
                      ),
                    ),
                  )),
          ],
        ),
      ),
    );
  }
}
