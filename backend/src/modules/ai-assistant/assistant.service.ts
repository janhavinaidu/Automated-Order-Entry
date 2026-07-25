import { groq, AI_MODELS } from '../../config/ai';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface ExecutedQuery {
  sql: string;
  success: boolean;
  rowCount: number;
  error?: string;
  result?: any;
}

export interface AssistantChatResponse {
  message: string;
  queries: ExecutedQuery[];
}

// ─── BigInt-safe JSON stringify ────────────────────────────────────────────────
// PostgreSQL COUNT(*) returns BigInt; standard JSON.stringify can't handle it.
const safeJsonStringify = (value: unknown): string =>
  JSON.stringify(value, (_key, val) =>
    typeof val === 'bigint' ? Number(val) : val
  );

// ─── SQL Safety Blocker ────────────────────────────────────────────────────────

const isReadOnlyQuery = (sql: string): boolean => {
  const cleanSql = sql.trim().toLowerCase();
  
  // Must start with read-only commands
  if (
    !cleanSql.startsWith('select') &&
    !cleanSql.startsWith('with') &&
    !cleanSql.startsWith('show') &&
    !cleanSql.startsWith('describe') &&
    !cleanSql.startsWith('explain')
  ) {
    return false;
  }

  // List of forbidden words representing modification/structure changes
  const forbiddenKeywords = [
    'insert',
    'update',
    'delete',
    'drop',
    'alter',
    'truncate',
    'create',
    'grant',
    'revoke',
    'replace',
    'upsert',
    'merge',
    'call',
    'execute'
  ];

  for (const keyword of forbiddenKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(cleanSql)) {
      return false;
    }
  }

  return true;
};

// ─── Schema Description ────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a highly capable AI assistant for OrderPilot AI, an enterprise-grade Order Management System (OMS).
Your role is to help the admin user query and understand the database and application status.
To retrieve data from the database, you have access to a tool: \`execute_read_only_sql_query(sql_query: string)\`.

DATABASE SCHEMA:
The database uses PostgreSQL. All table names are lowercase and plural, and all column names are snake_case.
Here is the schema of the tables you can query:

1. \`users\`
   - \`id\` (UUID, primary key)
   - \`email\` (text, unique)
   - \`name\` (text)
   - \`role\` (UserRole: 'ADMIN', 'INVENTORY', 'VIEWER')
   - \`password_hash\` (text)
   - \`avatar_initials\` (text, nullable)
   - \`is_active\` (boolean, default true)
   - \`created_at\` (timestamp)
   - \`updated_at\` (timestamp)

2. \`customers\`
   - \`id\` (UUID, primary key)
   - \`name\` (text) - Customer name
   - \`company\` (text) - Company name
   - \`email\` (text, unique)
   - \`phone\` (text, nullable)
   - \`address\` (text, nullable)
   - \`city\` (text, nullable)
   - \`state\` (text, nullable)
   - \`pincode\` (text, nullable)
   - \`payment_terms\` (text, nullable)
   - \`contract_ref\` (text, nullable)
   - \`avatar\` (text, nullable)
   - \`notes\` (text, nullable)
   - \`is_active\` (boolean, default true)
   - \`created_at\` (timestamp)
   - \`updated_at\` (timestamp)

3. \`emails\`
   - \`id\` (UUID, primary key)
   - \`from_email\` (text)
   - \`from_name\` (text, nullable)
   - \`company\` (text, nullable)
   - \`avatar\` (text, nullable)
   - \`subject\` (text)
   - \`preview\` (text, nullable)
   - \`body\` (text)
   - \`received_at\` (timestamp)
   - \`is_read\` (boolean, default false)
   - \`has_attachments\` (boolean, default false)
   - \`status\` (EmailStatus: 'PENDING', 'PROCESSING', 'PROCESSED', 'FAILED')
   - \`customer_id\` (UUID, nullable, references customers.id)
   - \`message_id\` (text, unique, nullable)
   - \`created_at\` (timestamp)
   - \`updated_at\` (timestamp)

4. \`attachments\`
   - \`id\` (UUID, primary key)
   - \`email_id\` (UUID, references emails.id)
   - \`filename\` (text)
   - \`file_type\` (text)
   - \`file_size_bytes\` (integer)
   - \`storage_path\` (text)
   - \`mime_type\` (text, nullable)
   - \`created_at\` (timestamp)

5. \`ai_extraction_jobs\`
   - \`id\` (UUID, primary key)
   - \`email_id\` (UUID, unique, references emails.id)
   - \`status\` (ExtractionStatus: 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED')
   - \`confidence\` (double precision, nullable)
   - \`customer_name\` (text, nullable)
   - \`delivery_date\` (text, nullable)
   - \`priority\` (Priority: 'URGENT', 'HIGH', 'MEDIUM', 'LOW', nullable)
   - \`summary\` (text, nullable)
   - \`raw_response\` (JSON, nullable)
   - \`error_message\` (text, nullable)
   - \`model_used\` (text, nullable)
   - \`started_at\` (timestamp, nullable)
   - \`completed_at\` (timestamp, nullable)
   - \`created_at\` (timestamp)

6. \`extracted_products\`
   - \`id\` (UUID, primary key)
   - \`job_id\` (UUID, references ai_extraction_jobs.id)
   - \`name\` (text)
   - \`sku\` (text)
   - \`quantity\` (integer)
   - \`unit_price\` (double precision)
   - \`confidence\` (double precision, nullable)
   - \`created_at\` (timestamp)

7. \`validation_results\`
   - \`id\` (UUID, primary key)
   - \`job_id\` (UUID, unique, references ai_extraction_jobs.id)
   - \`overall_status\` (text)
   - \`issues\` (JSON)
   - \`created_at\` (timestamp)
   - \`updated_at\` (timestamp)

8. \`orders\`
   - \`id\` (UUID, primary key)
   - \`order_number\` (text, unique)
   - \`customer_id\` (UUID, references customers.id)
   - \`email_id\` (UUID, references emails.id, nullable)
   - \`status\` (OrderStatus: 'PENDING', 'PROCESSING', 'APPROVED', 'MANUFACTURING', 'INVOICED', 'DISPATCHED', 'DELIVERED', 'REJECTED')
   - \`amount\` (double precision) - This is the sub-total amount before tax
   - \`currency\` (text, default 'INR')
   - \`delivery_date\` (timestamp, nullable)
   - \`priority\` (Priority: 'URGENT', 'HIGH', 'MEDIUM', 'LOW')
   - \`notes\` (text, nullable)
   - \`progress\` (integer, default 0)
   - \`created_by_id\` (UUID, references users.id, nullable)
   - \`created_at\` (timestamp)
   - \`updated_at\` (timestamp)

9. \`order_items\`
   - \`id\` (UUID, primary key)
   - \`order_id\` (UUID, references orders.id)
   - \`inventory_item_id\` (UUID, references inventory_items.id, nullable)
   - \`name\` (text)
   - \`sku\` (text)
   - \`quantity\` (integer)
   - \`unit_price\` (double precision)
   - \`total\` (double precision)
   - \`inventory_status\` (OrderItemInventoryStatus: 'AVAILABLE', 'PARTIAL', 'UNAVAILABLE')
   - \`available_qty\` (integer, default 0)
   - \`created_at\` (timestamp)

10. \`inventory_items\`
    - \`id\` (UUID, primary key)
    - \`name\` (text)
    - \`sku\` (text, unique)
    - \`category\` (text)
    - \`total_qty\` (integer, default 0) - Total physical stock in warehouse
    - \`available_qty\` (integer, default 0) - Stock available for new orders (total_qty - reserved_qty)
    - \`reserved_qty\` (integer, default 0) - Stock reserved for approved/processing orders
    - \`reorder_level\` (integer, default 0)
    - \`unit\` (text, default 'units')
    - \`status\` (InventoryStatus: 'HEALTHY', 'LOW', 'CRITICAL')
    - \`created_at\` (timestamp)
    - \`updated_at\` (timestamp)

11. \`manufacturing_jobs\`
    - \`id\` (UUID, primary key)
    - \`order_id\` (UUID, references orders.id)
    - \`order_item_id\` (UUID, references order_items.id, nullable)
    - \`description\` (text)
    - \`quantity_required\` (integer)
    - \`quantity_completed\` (integer, default 0)
    - \`status\` (ManufacturingJobStatus: 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')
    - \`estimated_completion\` (timestamp, nullable)
    - \`started_at\` (timestamp, nullable)
    - \`completed_at\` (timestamp, nullable)
    - \`notes\` (text, nullable)
    - \`created_at\` (timestamp)
    - \`updated_at\` (timestamp)

12. \`invoices\`
    - \`id\` (UUID, primary key)
    - \`order_id\` (UUID, unique, references orders.id)
    - \`invoice_number\` (text, unique)
    - \`amount\` (double precision) - Sub-total amount before tax
    - \`tax_rate\` (double precision, default 18) - 18% GST standard
    - \`tax_amount\` (double precision) - Amount * tax_rate / 100
    - \`total_amount\` (double precision) - Amount + tax_amount (this is the final revenue figure!)
    - \`due_date\` (timestamp)
    - \`status\` (InvoiceStatus: 'DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED')
    - \`pdf_path\` (text, nullable)
    - \`sent_at\` (timestamp, nullable)
    - \`paid_at\` (timestamp, nullable)
    - \`notes\` (text, nullable)
    - \`created_at\` (timestamp)
    - \`updated_at\` (timestamp)

13. \`shipments\`
    - \`id\` (UUID, primary key)
    - \`order_id\` (UUID, unique, references orders.id)
    - \`carrier\` (text, nullable)
    - \`awb_number\` (text, nullable)
    - \`status\` (ShipmentStatus: 'PENDING', 'IN_TRANSIT', 'DELIVERED', 'RETURNED')
    - \`shipping_address\` (text, nullable)
    - \`tracking_url\` (text, nullable)
    - \`dispatched_at\` (timestamp, nullable)
    - \`delivered_at\` (timestamp, nullable)
    - \`notes\` (text, nullable)
    - \`created_at\` (timestamp)
    - \`updated_at\` (timestamp)

14. \`notifications\`
    - \`id\` (UUID, primary key)
    - \`user_id\` (UUID, references users.id, nullable)
    - \`type\` (NotificationType: 'ORDER', 'INVENTORY', 'AI', 'DISPATCH', 'INVOICE')
    - \`title\` (text)
    - \`message\` (text)
    - \`is_read\` (boolean, default false)
    - \`metadata\` (JSON, nullable)
    - \`created_at\` (timestamp)

QUERY INSTRUCTIONS:
- You must ONLY use read-only SELECT queries.
- Limit the records returned by using LIMIT clauses (e.g. LIMIT 10 or LIMIT 20) unless aggregating (e.g. SUM, COUNT).
- **DATE AND TIMESTAMP CASTING RULES**: When comparing dates or using PostgreSQL date/time functions (such as \`DATE_TRUNC\`, \`EXTRACT\`, \`TO_CHAR\`), you **MUST** explicitly cast string literal dates. Otherwise, PostgreSQL will throw "not unique" or "could not choose a best candidate function" errors. Use syntax like \`'2026-07-22'::date\`, \`TIMESTAMP '2026-07-22'\`, or \`CAST('2026-07-22' AS date)\`.
  - *Example*: \`DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', TIMESTAMP '2026-07-22')\`
  - *Example*: \`TO_CHAR(paid_at, 'YYYY-MM') = TO_CHAR(TIMESTAMP '2026-07-22', 'YYYY-MM')\`
- **REVENUE CALCULATION LOGIC**:
  - Revenue can be measured as the sum of \`total_amount\` in the \`invoices\` table. The most strict definition is paid invoices (\`status = 'PAID'\`).
  - If a query for paid invoices yields null/zero, check for invoices with other statuses (e.g., \`SENT\`, \`DRAFT\`) or check the sum of \`amount\` in the \`orders\` table (which represents total order bookings).
  - Always explain your calculations, stating what you are summing (e.g., "Summing paid invoices yields ₹0, but there is a pending invoice of status 'SENT' for ₹464,920 and total order bookings of ₹5.13M...").
- Format currency amounts in INR (₹) or standard formatting since the default currency is INR.
- Do not write comments in SQL that include mutative keywords.
- Always double check table and column names against the schema.
- If you receive a SQL error, analyze it and try running a corrected query.
- Today's date is ${new Date().toISOString().split('T')[0]}. Use this for any queries that relate to "today", "this month", "recent", or filter by date.
`;

// ─── Assistant Service ─────────────────────────────────────────────────────────

export class AssistantService {
  /**
   * Processes the chat conversation, calling Groq and executing tools if needed.
   */
  static async processChat(history: ChatMessage[]): Promise<AssistantChatResponse> {
    const executedQueries: ExecutedQuery[] = [];
    
    // We clone the history and inject the system prompt at the beginning
    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map(m => ({ role: m.role, content: m.content, name: m.name, tool_call_id: m.tool_call_id }))
    ];

    // Define the database query tool
    const tools = [
      {
        type: 'function' as const,
        function: {
          name: 'execute_read_only_sql_query',
          description: 'Runs a SELECT SQL query on the PostgreSQL database to retrieve information about users, orders, revenue, inventory, manufacturing, or invoices. Must be read-only.',
          parameters: {
            type: 'object',
            properties: {
              sql_query: {
                type: 'string',
                description: 'The SELECT SQL query to execute. Example: "SELECT SUM(total_amount) FROM invoices WHERE status = \'PAID\'"'
              }
            },
            required: ['sql_query']
          }
        }
      }
    ];

    let loopCount = 0;
    const maxLoops = 4; // Allow up to 4 turns of tool execution

    while (loopCount < maxLoops) {
      loopCount++;
      logger.info(`[Assistant] Sending chat history to Groq (loop ${loopCount}/${maxLoops})`);
      
      try {
        const response = await groq.chat.completions.create({
          model: AI_MODELS.TEXT,
          temperature: 0.1,
          messages: messages,
          tools: tools,
          tool_choice: 'auto'
        });

        const choice = response.choices[0];
        const assistantMessage = choice.message;

        // Add assistant's response to the message history
        messages.push(assistantMessage);

        // If the model does not want to call a tool, we are done
        if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
          logger.info(`[Assistant] Final answer received from AI.`);
          return {
            message: assistantMessage.content || '',
            queries: executedQueries
          };
        }

        // Handle tool calls
        for (const toolCall of assistantMessage.tool_calls) {
          if (toolCall.function.name === 'execute_read_only_sql_query') {
            let sqlQuery = '';
            try {
              const args = JSON.parse(toolCall.function.arguments);
              sqlQuery = args.sql_query;
            } catch (err) {
              logger.error('[Assistant] Failed to parse tool call arguments', { err, args: toolCall.function.arguments });
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                name: 'execute_read_only_sql_query',
                content: JSON.stringify({ error: 'Failed to parse JSON arguments. Make sure you provide a valid JSON object with "sql_query" key.' })
              });
              continue;
            }

            logger.info(`[Assistant] Executing SQL: ${sqlQuery}`);

            // Safety check
            if (!isReadOnlyQuery(sqlQuery)) {
              logger.warn(`[Assistant] Blocked unsafe SQL query: ${sqlQuery}`);
              const errorMsg = 'Access Denied: Only read-only SELECT queries are allowed. Operations like UPDATE, DELETE, INSERT, DROP, CREATE, ALTER, etc. are blocked for security.';
              
              executedQueries.push({
                sql: sqlQuery,
                success: false,
                rowCount: 0,
                error: errorMsg
              });

              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                name: 'execute_read_only_sql_query',
                content: JSON.stringify({ error: errorMsg })
              });
              continue;
            }

            // Execute SQL query
            try {
              const result = await prisma.$queryRawUnsafe<any[]>(sqlQuery);
              
              const rowCount = Array.isArray(result) ? result.length : 0;
              logger.info(`[Assistant] Query executed successfully, rows returned: ${rowCount}`);

              // Truncate results if they are too large
              let resultForModel = result;
              let wasTruncated = false;
              if (rowCount > 30) {
                resultForModel = result.slice(0, 30);
                wasTruncated = true;
              }

              let contentStr = safeJsonStringify(resultForModel);
              if (contentStr.length > 3500) {
                contentStr = contentStr.slice(0, 3500) + '... [Truncated due to size constraints]';
                wasTruncated = true;
              }

              if (wasTruncated) {
                contentStr += `\nWarning: The result was truncated to fit token limits. There are ${rowCount} rows in total. Use LIMIT or filters to get specific data.`;
              }

              executedQueries.push({
                sql: sqlQuery,
                success: true,
                rowCount: rowCount,
                result: JSON.parse(safeJsonStringify(result.slice(0, 5))) // Store first 5 rows; convert BigInt to Number
              });

              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                name: 'execute_read_only_sql_query',
                content: contentStr
              });
            } catch (queryErr: any) {
              logger.error('[Assistant] Database execution error', { error: queryErr?.message || queryErr });
              const errorMsg = `SQL Execution Error: ${queryErr?.message || String(queryErr)}`;
              
              executedQueries.push({
                sql: sqlQuery,
                success: false,
                rowCount: 0,
                error: errorMsg
              });

              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                name: 'execute_read_only_sql_query',
                content: safeJsonStringify({ error: errorMsg })
              });
            }
          }
        }
      } catch (err) {
        logger.error('[Assistant] Groq API call error', { err });
        throw err;
      }
    }

    // If we exceed the max turns, return what we have
    return {
      message: 'I ran into a loop while executing database queries. Please try to rephrase your request or make it more specific.',
      queries: executedQueries
    };
  }
}
