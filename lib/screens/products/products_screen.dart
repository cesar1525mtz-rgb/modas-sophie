import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:modas_sophie/screens/products/add_product_screen.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final supabase = Supabase.instance.client;

  List<Map<String, dynamic>> productos = [];
  bool cargando = true;

  @override
  void initState() {
    super.initState();
    cargarProductos();
  }

  Future<void> cargarProductos() async {
    final data = await supabase
        .from('productos')
        .select()
        .order('nombre');

    if (!mounted) return;

    setState(() {
      productos = List<Map<String, dynamic>>.from(data);
      cargando = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Productos'),
        backgroundColor: const Color(0xFFE91E63),
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: const Color(0xFFE91E63),
        onPressed: () async {
          await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => const AddProductScreen(),
            ),
          );
          cargarProductos();
        },
        child: const Icon(Icons.add),
      ),
      body: cargando
          ? const Center(child: CircularProgressIndicator())
          : productos.isEmpty
              ? const Center(
                  child: Text(
                    'No hay productos',
                    style: TextStyle(color: Colors.white, fontSize: 20),
                  ),
                )
              : ListView.builder(
                  itemCount: productos.length,
                  itemBuilder: (context, index) {
                    final producto = productos[index];

                    return Card(
                      color: const Color(0xFF1F1F1F),
                      margin: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 8),
                      child: ListTile(
                        leading: const Icon(
                          Icons.shopping_bag,
                          color: Color(0xFFE91E63),
                        ),
                        title: Text(
                          producto['nombre'],
                          style: const TextStyle(color: Colors.white),
                        ),
                        subtitle: Text(
                          'Existencia: ${producto['existencia'] ?? 0}',
                          style: const TextStyle(color: Colors.white70),
                        ),
                        trailing: Text(
                          '\$${producto['precio_venta']}',
                          style: const TextStyle(
                            color: Color(0xFFE91E63),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
