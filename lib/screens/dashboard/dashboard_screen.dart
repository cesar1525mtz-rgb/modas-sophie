import 'package:flutter/material.dart';
import 'package:modas_sophie/screens/categories/categories_screen.dart';
import 'package:modas_sophie/screens/products/products_screen.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final items = [
      {'icon': Icons.point_of_sale, 'title': 'Ventas'},
      {'icon': Icons.inventory_2, 'title': 'Productos'},
      {'icon': Icons.category, 'title': 'Categorías'},
      {'icon': Icons.people, 'title': 'Clientes'},
      {'icon': Icons.payments, 'title': 'Caja'},
      {'icon': Icons.bar_chart, 'title': 'Reportes'},
      {'icon': Icons.settings, 'title': 'Configuración'},
      {'icon': Icons.logout, 'title': 'Salir'},
    ];

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.pink,
        title: const Text('Modas Sophie'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: GridView.builder(
          itemCount: items.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
          ),
          itemBuilder: (context, index) {
            final item = items[index];

            return Card(
              color: const Color(0xFF1F1F1F),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(18),
              ),
              child: InkWell(
                borderRadius: BorderRadius.circular(18),
                onTap: () {
                  if (item['title'] == 'Productos') {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const ProductsScreen(),
                      ),
                    );
                  } else if (item['title'] == 'Categorías') {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const CategoriesScreen(),
                      ),
                    );
                  }
                },
                child:Column(
  mainAxisAlignment: MainAxisAlignment.center,
  children: [
    Icon(
      item['icon'] as IconData,
      color: Colors.pink,
      size: 48,
    ),
    const SizedBox(height: 12),
    Text(
      item['title'] as String,
      style: const TextStyle(
        color: Colors.white,
        fontWeight: FontWeight.bold,
        fontSize: 18,
      ),
      textAlign: TextAlign.center,
    ),
  ],
),
              ),
            );
          },
        ),
      ),
    );
  }
}

