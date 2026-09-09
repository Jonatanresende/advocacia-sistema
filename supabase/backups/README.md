# Backup das Configurações e Tabelas do Supabase

Este diretório contém os scripts de backup e restauração de todas as tabelas e configurações do banco de dados do sistema **advocacia-sistema**.

---

## 📁 Arquivos Incluídos

- [`schema_completo_backup.sql`](file:///c:/Users/jonat/OneDrive/Desktop/advocacia-sistema/sistema-adv/supabase/backups/schema_completo_backup.sql): Script SQL completo e idempotente contendo:
  - Todas as 10 tabelas do sistema (`leads_adv`, `clientes_adv`, `agendamentos_adv`, `advogados`, `advogado_hours`, `office_config`, `office_hours`, `documentos_lead`, `perfis`, `permissoes_role`).
  - Todos os Enums e tipos customizados.
  - Funções auxiliares e triggers (ex: `handle_new_user`, `get_my_role`).
  - Políticas de Segurança por Linha (**Row Level Security - RLS**).
  - Carga inicial de dados padrão (seeds).

---

## 🚀 Como Restaurar / Aplicar no Supabase

### Opção 1: Via Supabase SQL Editor (Interface Web)
1. Acesse o seu painel do Supabase ([app.supabase.com](https://app.supabase.com)).
2. Acesse o seu projeto.
3. No menu lateral esquerdo, clique em **SQL Editor**.
4. Clique em **New Query**.
5. Copie e cole todo o conteúdo do arquivo [`schema_completo_backup.sql`](file:///c:/Users/jonat/OneDrive/Desktop/advocacia-sistema/sistema-adv/supabase/backups/schema_completo_backup.sql).
6. Clique no botão **Run** para executar e recriar toda a estrutura.

### Opção 2: Via Supabase CLI (Linha de Comando)
Se você estiver conectado ao Supabase via CLI local:

```bash
# Para aplicar no ambiente local:
npx supabase db reset

# Para extrair um dump completo com os dados da nuvem:
npx supabase db dump --linked > supabase/backups/dump_dados_$(date +%Y%m%d).sql
```
