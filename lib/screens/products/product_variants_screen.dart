import 'package:flutter/material.dart';

class ProductVariantsScreen extends StatelessWidget {
  final Map<String, dynamic> producto;

  const ProductVariantsScreen({
    super.key,
    required this.producto,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: Text(producto['nombre']),
        backgroundColor: const Color(0xFFE91E63),
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: const Color(0xFFE91E63),
        onPressed: () {},
        child: const Icon(Icons.add),
      ),
      body: const Center(
        child: Text(
          'Aquí aparecerán las variantes',
          style: TextStyle(
            color: Colors.white,
            fontSize: 18,
          ),
        ),
      ),
    );
  }
}
