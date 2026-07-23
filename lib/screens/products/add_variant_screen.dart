import 'package:flutter/material.dart';
import 'package:modas_sophie/repositories/product_repository.dart';

class AddVariantScreen extends StatefulWidget {
  final Map<String, dynamic> producto;

  const AddVariantScreen({
    super.key,
    required this.producto,
  });

  @override
  State<AddVariantScreen> createState() => _AddVariantScreenState();
}

class _AddVariantScreenState extends State<AddVariantScreen> {
  final _repository = ProductRepository();

  final colorController = TextEditingController();
  final tallaController = TextEditingController();
  final stockController = TextEditingController(text: '0');
  final stockMinimoController = TextEditingController(text: '0');
  final skuController = TextEditingController();
  final codigoController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Agregar variante'),
        backgroundColor: const Color(0xFFE91E63),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextFormField(
              controller: colorController,
              decoration: const InputDecoration(
                labelText: 'Color',
              ),
            ),

            const SizedBox(height: 16),

            TextFormField(
              controller: tallaController,
              decoration: const InputDecoration(
                labelText: 'Talla',
              ),
            ),

            const SizedBox(height: 16),

            TextFormField(
              controller: stockController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Stock',
              ),
            ),

            const SizedBox(height: 16),

            TextFormField(
              controller: stockMinimoController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Stock mínimo',
              ),
            ),
            const SizedBox(height: 16),

            TextFormField(
              controller: skuController,
              decoration: const InputDecoration(
                labelText: 'SKU',
              ),
            ),

            const SizedBox(height: 16),

            TextFormField(
              controller: codigoController,
              decoration: const InputDecoration(
                labelText: 'Código de barras',
              ),
            ),

            const SizedBox(height: 30),

            ElevatedButton(
              onPressed: () async {
                try {
                  final session = Supabase.instance.client.auth.currentSession;
ScaffoldMessenger.of(context).showSnackBar(
  SnackBar(
    content: Text("SESSION: ${session?.user.id}"),
  ),
);

await _repository.crearVariantes([
                    {
                      'producto_id': widget.producto['id'],
                      'color': colorController.text,
                      'talla': tallaController.text,
                      'stock': int.tryParse(stockController.text) ?? 0,
                      'stock_minimo':
                          int.tryParse(stockMinimoController.text) ?? 0,
                      'sku': skuController.text,
                      'codigo_barras': codigoController.text,
                      'activo': true,
                    }
                  ]);

                  if (!mounted) return;
                  Navigator.pop(context);
                } catch (e) {
                  if (!mounted) return;

                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(e.toString()),
                    ),
                  );
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFE91E63),
              ),
              child: const Text('Guardar'),
            ),
          ],
        ),
      ),
    );
  }
}
