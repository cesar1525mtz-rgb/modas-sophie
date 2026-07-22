import 'package:supabase_flutter/supabase_flutter.dart';

class ProductRepository {
  final _supabase = Supabase.instance.client;

  Future<void> crearProducto(Map<String, dynamic> producto) async {
    await _supabase.from('productos').insert(producto);
  }

  Future<List<Map<String, dynamic>>> obtenerCategorias() async {
    final data = await _supabase
        .from('categorias')
        .select('id,nombre')
        .eq('activo', true)
        .order('nombre');

    return List<Map<String, dynamic>>.from(data);
  }

  Future<void> crearVariantes(
      List<Map<String, dynamic>> variantes) async {
    if (variantes.isEmpty) return;

    await _supabase
        .from('producto_variantes')
        .insert(variantes);
  }

  Future<List<Map<String, dynamic>>> obtenerVariantes(String productoId) async {
    final data = await _supabase
        .from('producto_variantes')
        .select()
        .eq('producto_id', productoId)
        .order('color')
        .order('talla');

    return List<Map<String, dynamic>>.from(data);
  }
}
