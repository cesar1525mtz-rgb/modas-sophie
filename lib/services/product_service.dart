import 'package:supabase_flutter/supabase_flutter.dart';

class ProductService {
  final _supabase = Supabase.instance.client;

  Future<List<Map<String, dynamic>>> getCategories() async {
    final data = await _supabase
        .from('categorias')
        .select('id,nombre')
        .eq('activo', true)
        .order('nombre');

    return List<Map<String, dynamic>>.from(data);
  }

  Future<void> createProduct(Map<String, dynamic> product) async {
    await _supabase.from('productos').insert(product);
  }

  Future<void> createVariants(
    List<Map<String, dynamic>> variants,
  ) async {
    await _supabase
        .from('producto_variantes')
        .insert(variants);
  }
}
