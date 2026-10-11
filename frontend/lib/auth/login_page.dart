import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../auth/auth_provider.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({Key? key}) : super(key: key);

  @override
  _LoginPageState createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;

  void _login() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      await Provider.of<AuthProvider>(context, listen: false).login(
        _emailController.text.trim(),
        _passwordController.text,
      );

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Connexion réussie! 🎉')),
      );
    } catch (error) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur: $error'), backgroundColor: Colors.red),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _loginWithGoogle() async {
    setState(() => _isLoading = true);
    try {
      final signedIn = await Provider.of<AuthProvider>(context, listen: false)
          .loginWithGoogle();
      if (!mounted) return;
      if (signedIn) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Connexion Google réussie!')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
                'Connexion Google non aboutie. Vérifiez le navigateur et la configuration OAuth.'),
            backgroundColor: Colors.orange,
          ),
        );
      }
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text('Erreur Google: $error'),
            backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final isWideLayout = constraints.maxWidth >= 760;
            return Row(
              children: [
                if (isWideLayout)
                  Expanded(
                    flex: 9,
                    child: Container(
                      height: double.infinity,
                      padding: const EdgeInsets.fromLTRB(42, 38, 52, 30),
                      decoration: const BoxDecoration(color: Color(0xFF171A29)),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Image.asset('assets/sellmaster-mark.png',
                                  width: 36, height: 36),
                              const SizedBox(width: 12),
                              const Text('SELLMASTER',
                                  style: TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 13)),
                            ],
                          ),
                          const Spacer(),
                          const Text('VOTRE COMMERCE, EN MOUVEMENT',
                              style: TextStyle(
                                  color: Color(0xFF9BA5C6),
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 1.1)),
                          const SizedBox(height: 20),
                          Text('Chaque commande mérite un meilleur suivi.',
                              style: GoogleFonts.poppins(
                                  color: const Color(0xFFF8F8FC),
                                  fontSize: 42,
                                  height: 1.12,
                                  fontWeight: FontWeight.w600)),
                          const SizedBox(height: 18),
                          const Text(
                              'Retrouvez vos ventes, produits et opérations dans un espace de travail pensé pour les e-commerçants.',
                              style: TextStyle(
                                  color: Color(0xFFC1C5D5),
                                  fontSize: 15,
                                  height: 1.7)),
                          const SizedBox(height: 30),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: List.generate(10, (index) {
                              const heights = <double>[
                                28,
                                39,
                                33,
                                53,
                                43,
                                65,
                                55,
                                76,
                                68,
                                92
                              ];
                              return Expanded(
                                child: Padding(
                                  padding: const EdgeInsets.only(right: 8),
                                  child: Container(
                                    height: heights[index],
                                    decoration: BoxDecoration(
                                      color: index == 9
                                          ? const Color(0xFFAAB9FF)
                                          : const Color(0xFF637CF3),
                                      borderRadius: const BorderRadius.vertical(
                                          top: Radius.circular(4)),
                                    ),
                                  ),
                                ),
                              );
                            }),
                          ),
                          const Spacer(),
                          const Row(
                            children: [
                              Icon(Icons.verified_user_outlined,
                                  size: 16, color: Color(0xFFB2BCDF)),
                              SizedBox(width: 9),
                              Text(
                                  'Connexion sécurisée à votre espace Sellmaster',
                                  style: TextStyle(
                                      color: Color(0xFFB2BCDF), fontSize: 12)),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                Expanded(
                  flex: isWideLayout ? 11 : 1,
                  child: Center(
                    child: SingleChildScrollView(
                      padding: EdgeInsets.all(isWideLayout ? 32 : 20),
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 400),
                        child: Container(
                          padding: EdgeInsets.all(isWideLayout ? 0 : 24),
                          decoration: isWideLayout
                              ? null
                              : BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                      color: const Color(0xFFE3E7F0), width: 1),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFF171A29)
                                          .withOpacity(0.06),
                                      blurRadius: 24,
                                      offset: const Offset(0, 8),
                                    ),
                                  ],
                                ),
                          child: Form(
                            key: _formKey,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (!isWideLayout)
                                  Row(
                                    children: [
                                      Image.asset(
                                        'assets/sellmaster-mark.png',
                                        width: 34,
                                        height: 34,
                                        fit: BoxFit.contain,
                                      ),
                                      const SizedBox(width: 12),
                                      const Expanded(
                                        child: Text(
                                          'SELLMASTER',
                                          style: TextStyle(
                                            fontSize: 12,
                                            letterSpacing: 0.18,
                                            fontWeight: FontWeight.w800,
                                            color: Color(0xFF4D636D),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                const SizedBox(height: 26),
                                Text(
                                  'Connectez votre compte',
                                  style: GoogleFonts.poppins(
                                    fontSize: 30,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF171A27),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                const Text(
                                  'Gérez vos commandes, vos relances et votre logistique depuis un seul espace.',
                                  style: TextStyle(
                                    fontSize: 15,
                                    color: Color(0xFF4D636D),
                                    height: 1.55,
                                  ),
                                ),
                                const SizedBox(height: 26),
                                TextFormField(
                                  controller: _emailController,
                                  decoration: const InputDecoration(
                                    labelText: 'Email',
                                    prefixIcon: Icon(Icons.email_outlined),
                                  ),
                                  keyboardType: TextInputType.emailAddress,
                                  validator: (value) {
                                    if (value == null || value.isEmpty) {
                                      return 'Veuillez entrer votre email';
                                    }
                                    if (!value.contains('@')) {
                                      return 'Email invalide';
                                    }
                                    return null;
                                  },
                                ),
                                const SizedBox(height: 18),
                                TextFormField(
                                  controller: _passwordController,
                                  decoration: const InputDecoration(
                                    labelText: 'Mot de passe',
                                    prefixIcon: Icon(Icons.lock_outline),
                                  ),
                                  obscureText: true,
                                  validator: (value) {
                                    if (value == null || value.isEmpty) {
                                      return 'Veuillez entrer votre mot de passe';
                                    }
                                    if (value.length < 6) {
                                      return 'Le mot de passe doit faire au moins 6 caractères';
                                    }
                                    return null;
                                  },
                                ),
                                const SizedBox(height: 26),
                                _isLoading
                                    ? const Center(
                                        child: CircularProgressIndicator())
                                    : SizedBox(
                                        width: double.infinity,
                                        height: 52,
                                        child: ElevatedButton(
                                          onPressed: _login,
                                          child: const Text('Se connecter'),
                                        ),
                                      ),
                                const SizedBox(height: 14),
                                SizedBox(
                                  width: double.infinity,
                                  height: 50,
                                  child: OutlinedButton.icon(
                                    onPressed: _isLoading ||
                                            (!kIsWeb &&
                                                defaultTargetPlatform ==
                                                    TargetPlatform.linux)
                                        ? null
                                        : _loginWithGoogle,
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: const Color(0xFF171A27),
                                      side: const BorderSide(
                                          color: Color(0xFFB8D1CF)),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(7),
                                      ),
                                    ),
                                    icon: const Icon(Icons.login_outlined),
                                    label: Text(
                                      (!kIsWeb &&
                                              defaultTargetPlatform ==
                                                  TargetPlatform.linux)
                                          ? 'Google indisponible sur Linux'
                                          : 'Continuer avec Google',
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 18),
                                Align(
                                  alignment: Alignment.center,
                                  child: TextButton(
                                    onPressed: () {
                                      Navigator.pushNamed(
                                          context, '/auth/register');
                                    },
                                    child: const Text(
                                      'Créer un compte',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }
}
