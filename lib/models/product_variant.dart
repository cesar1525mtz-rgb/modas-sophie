class ProductVariant {
  final String? id;
  final String? productoId;
  final String? talla;
  final String? color;
  final String? codigoBarras;
  final String? sku;
  final int stock;
  final int stockMinimo;
  final bool activo;

  ProductVariant({
    this.id,
    this.productoId,
    this.talla,
    this.color,
    this.codigoBarras,
    this.sku,
    this.stock = 0,
    this.stockMinimo = 0,
    this.activo = true,
  });

  Map<String, dynamic> toMap() {
    return {
      'producto_id': productoId,
      'talla': talla,
      'color': color,
      'codigo_barras': codigoBarras,
      'sku': sku,
      'stock': stock,
      'stock_minimo': stockMinimo,
      'activo': activo,
    };
  }

  factory ProductVariant.fromMap(Map<String, dynamic> map) {
    return ProductVariant(
      id: map['id'] as String?,
      productoId: map['producto_id'] as String?,
      talla: map['talla'] as String?,
      color: map['color'] as String?,
      codigoBarras: map['codigo_barras'] as String?,
      sku: map['sku'] as String?,
      stock: map['stock'] as int,
      stockMinimo: map['stock_minimo'] as int,
      activo: map['activo'] as bool,
    );
  }
}
