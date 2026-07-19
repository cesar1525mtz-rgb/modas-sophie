import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AddProductScreen extends StatefulWidget {
  const AddProductScreen({super.key});

  @override
  State<AddProductScreen> createState() => _AddProductScreenState();
}

class _AddProductScreenState extends State<AddProductScreen> {
  final supabase = Supabase.instance.client;

  final codigoController = TextEditingController();
  final nombreController = TextEditingController();
  final marcaController = TextEditingController();
  final tallaController = TextEditingController();
  final colorController = TextEditingController();
  final compraController = TextEditingController(text: "0");
  final ventaController = TextEditingController(text: "0");
  final existenciaController = TextEditingController(text: "0");

  List<Map<String, dynamic>> categorias = [];
  String? categoriaId;

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

    if (!mounted) return;

    setState(() {
      categorias = List<Map<String, dynamic>>.from(data);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Nuevo Producto'),
        backgroundColor: const Color(0xFFE91E63),
      ),
      body: const Center(
        child: Text(
          'Formulario de productos (siguiente paso)',
          style: TextStyle(color: Colors.white),
        ),
      ),
    );
  }
}
