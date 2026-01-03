import 'package:flutter_test/flutter_test.dart';
import 'package:number_drop/main.dart';

void main() {
  testWidgets('App starts and shows menu screen', (WidgetTester tester) async {
    await tester.pumpWidget(const NumberDropApp());

    // Verify that the menu screen is shown
    expect(find.text('NUMBER DROP'), findsOneWidget);
    expect(find.text('START GAME'), findsOneWidget);
  });
}
