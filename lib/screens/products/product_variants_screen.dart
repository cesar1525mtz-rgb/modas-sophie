import 'package:flutter/material.dart';
import 'package:modas_sophie/repositories/product_repository.dart';
import 'package:modas_sophie/screens/products/add_variant_screen.dart';

class ProductVariantsScreen extends StatefulWidget {
  final Map<String, dynamic> producto;

  const ProductVariantsScreen({
    super.key,
    required this.producto,
  });

  @override
  State<ProductVariantsScreen> createState() =>
      _ProductVariantsScreenState();
}

class _ProductVariantsScreenState
    extends State<ProductVariantsScreen> {
  final _repository = ProductRepository();

  bool cargando = true;
  List<Map<String, dynamic>> variantes = [];

  @override
  void initState() {
    super.initState();
    cargarVariantes();
  }

  Future<void> cargarVariantes() async {
    variantes =
        await _repository.obtenerVariantes(widget.producto['id']);

    if (mounted) {
      setState(() {
        cargando = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: const Color(0xFFE91E63),
        title: Text(widget.producto['nombre']),
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: const Color(0xFFE91E63),
        onPressed: () async {
          await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => AddVariantScreen(
                producto: widget.producto,
              ),
            ),
          );

          await cargarVariantes();
        },
        child: const Icon(Icons.add),
      ),
      body: cargando
          ? const Center(
              child: CircularProgressIndicator(),
            )
          : variantes.isEmpty
              ? const Center(
                  child: Text(
                    'Aún no hay variantes',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                    ),
                  ),
                )
              : ListView.builder(
                  itemCount: variantes.length,
                  itemBuilder: (context, index) {
                    final v = variantes[index];

                    return Card(
                      color: const Color(0xFF1E1E1E),
                      margin: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      child: ListTile(
                        title: Text(
                          '${v['color']} - ${v['talla']}',
                          style: const TextStyle(
                            color: Colors.white,
                          ),
                        ),
                        subtitle: Text(
                          'Stock: ${v['stock']}',
                          style: const TextStyle(
                            color: Colors.white70,
                          ),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
