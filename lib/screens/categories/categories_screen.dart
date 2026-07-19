import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class CategoriesScreen extends StatefulWidget {
  const CategoriesScreen({super.key});

  @override
  State<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends State<CategoriesScreen> {
  final supabase = Supabase.instance.client;

  List<Map<String, dynamic>> categorias = [];

  @override
  void initState() {
    super.initState();
    cargarCategorias();
  }

  Future<void> cargarCategorias() async {
    final data = await supabase
        .from('categorias')
        .select()
        .order('nombre');

    categorias = List<Map<String, dynamic>>.from(data);

    if (mounted) {
      setState(() {});
    }
  }

  Future<void> agregarCategoria() async {
    final controller = TextEditingController();

    await showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Nueva categoría'),
          content: TextField(
            controller: controller,
            autofocus: true,
            decoration: const InputDecoration(
              hintText: 'Nombre',
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: () async {
                final nombre = controller.text.trim();

                if (nombre.isEmpty) return;

                await supabase.from('categorias').insert({
                  'nombre': nombre,
                });

                if (mounted) {
                  Navigator.pop(context);
                }

                await cargarCategorias();
              },
              child: const Text('Guardar'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: const Color(0xFFE91E63),
        title: const Text('Categorías'),
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: const Color(0xFFE91E63),
        onPressed: agregarCategoria,
        child: const Icon(Icons.add),
      ),
      body: categorias.isEmpty
          ? const Center(
              child: Text(
                'No hay categorías.\nPulsa + para crear la primera.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                ),
              ),
            )
          : ListView.builder(
              itemCount: categorias.length,
              itemBuilder: (context, index) {
                final categoria = categorias[index];

                return Card(
                  color: const Color(0xFF1E1E1E),
                  margin: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  child: ListTile(
                    leading: const Icon(
                      Icons.category,
                      color: Color(0xFFE91E63),
                    ),
                    title: Text(
                      categoria['nombre'],
                      style: const TextStyle(
                        color: Colors.white,
                      ),
                    ),
                  ),
                );
              },
            ),
    );
  }
}
