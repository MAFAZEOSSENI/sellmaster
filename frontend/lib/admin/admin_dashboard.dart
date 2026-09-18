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
  final List<String> _availableRoles = ['owner', 'manager', 'closer', 'courier'];
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _members = [];

  @override
  void initState() {
    super.initState();
    _loadMembers();
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

  Future<void> _toggleRole(int userId, String role, bool selected) async {
    final updatedRoles = _members
        .firstWhere((member) => member['id'] == userId, orElse: () => {})['roles'] as List<dynamic>? ?? <dynamic>[];

    final nextRoles = List<String>.from(updatedRoles.map((item) => item.toString()));
    if (selected) {
      if (!nextRoles.contains(role)) {
        nextRoles.add(role);
      }
    } else {
      nextRoles.remove(role);
    }

    try {
      await ApiService.updateUserRoles(userId, nextRoles);
      await _loadMembers();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Rôles mis à jour avec succès')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: ${error.toString()}')),
        );
      }
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
                      _buildSummaryCards(),
                      const SizedBox(height: 20),
                      if (!isOwner)
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.orange.shade50,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Text(
                            'Vous pouvez consulter les rôles, mais seule la personne owner peut les modifier.',
                            style: TextStyle(color: Colors.orange),
                          ),
                        ),
                      const SizedBox(height: 12),
                      ..._members.map(_buildMemberCard),
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
      _summaryTile('Owners', owners.toString(), Icons.verified_user, Colors.purple),
      _summaryTile('Managers', managers.toString(), Icons.manage_accounts, Colors.blue),
      _summaryTile('Closers', closers.toString(), Icons.sell, Colors.green),
      _summaryTile('Couriers', couriers.toString(), Icons.local_shipping, Colors.orange),
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
                  child: Text(email.substring(0, 1).toUpperCase()),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(email, style: const TextStyle(fontWeight: FontWeight.bold)),
                      Text(member['phone'] ?? 'Sans téléphone', style: const TextStyle(color: Colors.grey)),
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
                    child: const Text('Owner', style: TextStyle(color: Colors.purple, fontWeight: FontWeight.w600)),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _availableRoles.map((role) {
                final selected = roles.contains(role);
                return FilterChip(
                  label: Text(role),
                  selected: selected,
                  onSelected: Provider.of<AuthProvider>(context).primaryRole == 'owner'
                      ? (value) => _toggleRole(userId, role, value)
                      : null,
                  selectedColor: switch (role) {
                    'owner' => Colors.purple.shade100,
                    'manager' => Colors.blue.shade100,
                    'closer' => Colors.green.shade100,
                    'courier' => Colors.orange.shade100,
                    _ => Colors.grey.shade200,
                  },
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
          ],
        ),
      ),
    );
  }
}
