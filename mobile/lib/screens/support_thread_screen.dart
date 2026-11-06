import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/env.dart';
import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../services/auth_service.dart' show isSupabaseReady;
import '../services/feature_flags.dart';

/// Order-linked support chat thread (FEATURE_SUPPORT_CHAT).
class SupportThreadScreen extends StatefulWidget {
  const SupportThreadScreen({super.key, required this.orderId});

  final String orderId;

  @override
  State<SupportThreadScreen> createState() => _SupportThreadScreenState();
}

class _SupportThreadScreenState extends State<SupportThreadScreen> {
  final _controller = TextEditingController();
  String? _threadId;
  List<Map<String, dynamic>> _messages = [];
  bool _loading = true;
  String? _error;

  Map<String, String> get _headers {
    final h = <String, String>{'Content-Type': 'application/json'};
    if (isSupabaseReady) {
      final session = Supabase.instance.client.auth.currentSession;
      if (session != null) {
        h['Authorization'] = 'Bearer ${session.accessToken}';
      }
    }
    return h;
  }

  Uri _uri(String path) =>
      Uri.parse('${Env.apiBaseUrl.replaceAll(RegExp(r'/$'), '')}$path');

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    await FeatureFlags.load();
    if (!FeatureFlags.current.enabled('supportChat')) {
      setState(() {
        _loading = false;
        _error = 'disabled';
      });
      return;
    }
    try {
      final create = await http.post(
        _uri('/support/threads'),
        headers: _headers,
        body: jsonEncode({'orderId': widget.orderId}),
      );
      if (create.statusCode >= 400) throw Exception(create.body);
      final thread = jsonDecode(create.body)['thread'] as Map<String, dynamic>;
      _threadId = thread['id']?.toString();
      await _loadMessages();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadMessages() async {
    if (_threadId == null) return;
    final res = await http.get(
      _uri('/support/threads/$_threadId/messages'),
      headers: _headers,
    );
    if (res.statusCode >= 400) return;
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    setState(() {
      _messages = List<Map<String, dynamic>>.from(data['messages'] as List? ?? []);
    });
  }

  Future<void> _send() async {
    final body = _controller.text.trim();
    if (body.isEmpty || _threadId == null) return;
    _controller.clear();
    await http.post(
      _uri('/support/threads/$_threadId/messages'),
      headers: _headers,
      body: jsonEncode({'body': body}),
    );
    await _loadMessages();
  }

  @override
  Widget build(BuildContext context) {
    final s = context.tr;
    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: Text(s.or('app.support.chat', 'Order support')),
        backgroundColor: AppColors.canvas,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(s.or('app.support.unavailable', 'Support chat unavailable')))
              : Column(
                  children: [
                    Expanded(
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _messages.length,
                        itemBuilder: (context, i) {
                          final m = _messages[i];
                          final mine = m['senderRole'] == 'customer' ||
                              m['senderRole'] == 'shopper';
                          return Align(
                            alignment:
                                mine ? Alignment.centerRight : Alignment.centerLeft,
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: mine ? AppColors.accent.withValues(alpha: 0.15) : Colors.white,
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Text('${m['body'] ?? ''}'),
                            ),
                          );
                        },
                      ),
                    ),
                    SafeArea(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _controller,
                                decoration: InputDecoration(
                                  hintText: s.or('app.support.placeholder', 'Write a message'),
                                  filled: true,
                                  fillColor: Colors.white,
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(14),
                                    borderSide: BorderSide.none,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            IconButton.filled(
                              onPressed: _send,
                              icon: const Icon(Icons.send_rounded),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }
}
