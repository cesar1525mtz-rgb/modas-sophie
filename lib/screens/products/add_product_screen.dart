import 'package:flutter/material.dart';
import '../../repositories/product_repository.dart';

class AddProductScreen extends StatefulWidget {
  const AddProductScreen({super.key});

  @override
  State<AddProductScreen> createState() => _AddProductScreenState();
}

class _AddProductScreenState extends State<AddProductScreen> {
  final _formKey = GlobalKey<FormState>();
  final _repository = ProductRepository();

  final _nombreController = TextEditingController();
  final _descripcionController = TextEditingController();
  final _precioCompraController = TextEditingController();
  final _precioVentaController = TextEditingController();

  List<Map<String, dynamic>> _categorias = [];
  String? _categoriaId;
  bool _guardando = false;
  bool _cargandoCategorias = true;

  @override
  void initState() {
    super.initState();
    _cargarCategorias();
  }

  Future<void> _cargarCategorias() async {
    try {
      final categorias = await _repository.obtenerCategorias();

      if (!mounted) return;

      setState(() {
        _categorias = categorias;
        _cargandoCategorias = false;
      });
    } catch (_) {
      if (!mounted) return;

      setState(() {
        _cargandoCategorias = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Error al cargar las categorías'),
        ),
      );
    }
  }

  @override
  void dispose() {
    _nombreController.dispose();
    _descripcionController.dispose();
    _precioCompraController.dispose();
    _precioVentaController.dispose();
    super.dispose();
  }  Future<void> _guardar() async {
    if (!_formKey.currentState!.validate()) return;

    if (_categoriaId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Selecciona una categoría'),
        ),
      );
      return;
    }

    setState(() {
      _guardando = true;
    });

    try {
      await _repository.crearProducto({
        'categoria_id': _categoriaId,
        'nombre': _nombreController.text.trim(),
        'descripcion': _descripcionController.text.trim(),
        'precio_compra':
            double.tryParse(_precioCompraController.text) ?? 0,
        'precio_venta':
            double.tryParse(_precioVentaController.text) ?? 0,
        'activo': true,
      });

      if (!mounted) return;

      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error al guardar: $e'),
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _guardando = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Nuevo producto'),
      ),
      body: _cargandoCategorias
          ? const Center(
              child: CircularProgressIndicator(),
            )
          : Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [                  DropdownButtonFormField<String>(
                    initialValue: _categoriaId,
                    decoration: const InputDecoration(
                      labelText: 'Categoría',
                      border: OutlineInputBorder(),
                    ),
                    items: _categorias.map((categoria) {
                      return DropdownMenuItem<String>(
                        value: categoria['id'].toString(),
                        child: Text(categoria['nombre']),
                      );
                    }).toList(),
                    onChanged: (value) {
                      setState(() {
                        _categoriaId = value;
                      });
                    },
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Selecciona una categoría';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _nombreController,
                    decoration: const InputDecoration(
                      labelText: 'Nombre',
                      border: OutlineInputBorder(),
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Ingresa el nombre';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _descripcionController,
                    decoration: const InputDecoration(
                      labelText: 'Descripción',
                      border: OutlineInputBorder(),
                    ),
                    maxLines: 3,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _precioCompraController,
                    decoration: const InputDecoration(
                      labelText: 'Precio de compra',
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _precioVentaController,
                    decoration: const InputDecoration(
                      labelText: 'Precio de venta',
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                  ),
                  const SizedBox(height: 24),                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _guardando ? null : _guardar,
                      child: _guardando
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                              ),
                            )
                          : const Text('Guardar producto'),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
