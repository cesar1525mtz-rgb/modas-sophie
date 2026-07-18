import 'package:flutter/material.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Text(
          'Login Modas Sophie',
          style: TextStyle(
            fontSize: 28,
            color: Colors.white,
          ),
        ),
      ),
      backgroundColor: Colors.black,
    );
  }
}
