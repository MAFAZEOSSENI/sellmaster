import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../auth/auth_provider.dart';
import '../services/api_service.dart';

class AdminDashboardPage extends StatefulWidget {
  const AdminDashboardPage({Key? key}) : super(key: key);

  @override
  State<AdminDashboardPage> createState() => _AdminDashboardPageState();
}

class _AdminDashboardPageState extends State<AdminDashboardPage> {
  final List<String> _availableRoles = ['manager', 'closer', 'courier'];
  String _roleLabel(String role) {
    switch (role) {
      case 'owner':
        return 'Propriétaire';
      case 'manager':
        return 'Manager';
      case 'closer':
        return 'Closer';
      case 'courier':
        return 'Livreur';
      default:
        return role;
    }
  }
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _members = [];
  List<Map<String, dynamic>> _searchResults = [];
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  String _selectedRole = 'closer';

  @override
  void initState() {
    super.initState();
    _loadMembers();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _emailController.dispose();
    _nameController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _loadMembers() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final members = await ApiService.getAdminUsers();
      setState(() {
        _members = members;
      });
    } catch (error) {
      setState(() {
        _error = error.toString();
      });
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  Future<void> _searchUsers() async {
    final query = _searchController.text.trim();
    if (query.isEmpty) {
      setState(() => _searchResults = []);
      return;
    }

    try {
      final results = await ApiService.searchUsers(query);
      setState(() => _searchResults = results);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Recherche impossible: $error')),
        );
      }
    }
  }

  Future<void> _createMember() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();
    final fullName = _nameController.text.trim();
    final phone = _phoneController.text.trim();

    if (email.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Email et mot de passe requis')),
      );
      return;
    }

    try {
      await ApiService.createTeamMember({
        'email': email,
        'password': password,
        'fullName': fullName,
        'phone': phone,
        'role': _selectedRole,
      });

      _emailController.clear();
      _nameController.clear();
      _phoneController.clear();
      _passwordController.clear();
      await _loadMembers();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Membre ajouté à l’équipe')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $error')),
        );
      }
    }
  }

  Future<void> _inviteExistingUser(int userId) async {
    try {
      await ApiService.createTeamMember({
        'email': _searchResults.firstWhere((item) => item['id'] == userId)['email'],
        'password': 'existing-user',
        'fullName': _searchResults.firstWhere((item) => item['id'] == userId)['full_name'] ?? '',
        'phone': _searchResults.firstWhere((item) => item['id'] == userId)['phone'] ?? '',
        'role': _selectedRole,
      });
      await _loadMembers();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Utilisateur ajouté à l’équipe')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $error')),
        );
      }
    }
  }

  Future<void> _saveCloserCommission(Map<String, dynamic> member) async {
    final membershipId = int.tryParse(member['membership_id'].toString());
    final amount = double.tryParse(member['commission_amount'].toString());
    final type = (member['commission_type'] ?? 'fixed_amount').toString();

    if (membershipId == null || amount == null || amount < 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Montant de commission invalide')),
      );
      return;
    }

    try {
      final updated = await ApiService.updateCloserCommission(
        membershipId,
        commissionAmount: amount,
        commissionType: type,
      );
      if (!mounted) return;
      setState(() {
        member['commission_amount'] = updated['commission_amount'];
        member['commission_type'] = updated['commission_type'];
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Commission du closer mise à jour')),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur: $error')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final isOwner = authProvider.primaryRole == 'owner';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Administration équipe'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadMembers,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(_error!, textAlign: TextAlign.center),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadMembers,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _buildCreateMemberCard(isOwner),
                      const SizedBox(height: 18),
                      _buildSearchCard(),
                      const SizedBox(height: 18),
                      _buildSummaryCards(),
                      const SizedBox(height: 18),
                      const SizedBox(height: 12),
                      ..._members.map(_buildMemberCard),
                    ],
                  ),
                ),
    );
  }

  Widget _buildCreateMemberCard(bool isOwner) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Créer un membre et lui attribuer un rôle', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            TextFormField(
              controller: _emailController,
              decoration: const InputDecoration(labelText: 'Email du membre'),
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Nom complet'),
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _phoneController,
              decoration: const InputDecoration(labelText: 'Téléphone'),
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _passwordController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Mot de passe'),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _selectedRole,
              items: _availableRoles
                  .map((role) => DropdownMenuItem(value: role, child: Text(_roleLabel(role))))
                  .toList(),
              onChanged: isOwner
                  ? (value) => setState(() => _selectedRole = value ?? 'closer')
                  : null,
              decoration: const InputDecoration(labelText: 'Rôle'),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: isOwner ? _createMember : null,
                icon: const Icon(Icons.person_add_alt_1),
                label: const Text('Créer le membre et l’ajouter à l’équipe'),
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildSearchCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Rechercher un membre existant', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: const InputDecoration(labelText: 'Recherche par nom, email ou téléphone'),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _searchUsers,
                  child: const Text('Chercher'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (_searchResults.isNotEmpty)
              ..._searchResults.map((user) {
                final id = user['id'];
                final email = user['email'] ?? 'Inconnu';
                final name = user['full_name'] ?? email.split('@').first;
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
                            Text(email),
                          ],
                        ),
                      ),
                      ElevatedButton(
                        onPressed: () => _inviteExistingUser(id),
                        child: const Text('Ajouter'),
                      ),
                    ],
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryCards() {
    final owners = _members.where((member) => (member['roles'] as List).contains('owner')).length;
    final managers = _members.where((member) => (member['roles'] as List).contains('manager')).length;
    final closers = _members.where((member) => (member['roles'] as List).contains('closer')).length;
    final couriers = _members.where((member) => (member['roles'] as List).contains('courier')).length;

    final cards = [
      _summaryTile('Membres', _members.length.toString(), Icons.people, Colors.cyan),
      _summaryTile('Propriétaires', owners.toString(), Icons.verified_user, Colors.purple),
      _summaryTile('Managers', managers.toString(), Icons.manage_accounts, Colors.blue),
      _summaryTile('Closers', closers.toString(), Icons.sell, Colors.green),
      _summaryTile('Livreurs', couriers.toString(), Icons.local_shipping, Colors.orange),
    ];

    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: cards,
    );
  }

  Widget _summaryTile(String label, String value, IconData icon, Color color) {
    return SizedBox(
      width: 140,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                    Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMemberCard(Map<String, dynamic> member) {
    final roles = List<String>.from((member['roles'] as List? ?? const []).map((item) => item.toString()));
    final email = member['email'] ?? 'Inconnu';
    final userId = member['id'];
    final isOwner = roles.contains('owner');
    final isCloser = roles.contains('closer');
    final membershipId = int.tryParse(member['membership_id'].toString());

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: Colors.cyan.shade50,
                  child: Text((member['full_name'] ?? email).toString().substring(0, 1).toUpperCase()),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(member['full_name'] ?? email.split('@').first, style: const TextStyle(fontWeight: FontWeight.bold)),
                      Text(email, style: const TextStyle(color: Colors.grey)),
                    ],
                  ),
                ),
                if (isOwner)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.purple.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: const Text('Propriétaire', style: TextStyle(color: Colors.purple, fontWeight: FontWeight.w600)),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: roles.map((role) {
                return Chip(
                  label: Text(_roleLabel(role)),
                  backgroundColor: role == 'owner'
                      ? Colors.purple.shade100
                      : role == 'manager'
                          ? Colors.blue.shade100
                          : role == 'closer'
                              ? Colors.green.shade100
                              : Colors.orange.shade100,
                );
              }).toList(),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(Icons.bar_chart, size: 16, color: Colors.grey.shade600),
                const SizedBox(width: 8),
                Text('Commandes: ${member['order_count'] ?? 0}/${member['max_orders'] ?? 10}'),
              ],
            ),
            if (isCloser && membershipId != null) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      key: ValueKey('commission-$membershipId-${member['commission_amount']}'),
                      initialValue: (member['commission_amount'] ?? 0).toString(),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Commission',
                        suffixText: 'montant',
                        isDense: true,
                      ),
                      onChanged: (value) => member['commission_amount'] = value,
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 135,
                    child: DropdownButtonFormField<String>(
                      value: ['fixed_amount', 'percentage'].contains(member['commission_type'])
                          ? member['commission_type']
                          : 'fixed_amount',
                      decoration: const InputDecoration(
                        labelText: 'Type',
                        isDense: true,
                      ),
                      items: const [
                        DropdownMenuItem(value: 'fixed_amount', child: Text('Montant fixe')),
                        DropdownMenuItem(value: 'percentage', child: Text('Pourcentage')),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => member['commission_type'] = value);
                        }
                      },
                    ),
                  ),
                  IconButton(
                    tooltip: 'Enregistrer la commission',
                    icon: const Icon(Icons.save_outlined),
                    onPressed: () => _saveCloserCommission(member),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
