import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  runApp(const LumenDriftApp());
}

class LumenDriftApp extends StatelessWidget {
  const LumenDriftApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Lumen Drift',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark(useMaterial3: true),
      home: const LumenDriftPage(),
    );
  }
}

class LumenDriftPage extends StatefulWidget {
  const LumenDriftPage({super.key});

  @override
  State<LumenDriftPage> createState() => _LumenDriftPageState();
}

class _LumenDriftPageState extends State<LumenDriftPage> {
  late final WebViewController _controller;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF041014))
      ..loadFlutterAsset('assets/game/index.html');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF041014),
      body: SafeArea(
        top: false,
        bottom: false,
        child: WebViewWidget(controller: _controller),
      ),
    );
  }
}
