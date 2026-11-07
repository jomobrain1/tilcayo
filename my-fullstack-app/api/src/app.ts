import { createApp, requestId, securityHeaders } from "@tilcayo/core";
import healthRoutes from "./routes/health.routes.js";
import notesRoutes from "./routes/notes.routes.js";
import authRoutes from "./routes/auth.routes.js";
import { auth } from "./auth.js";
import adminProductsRoutes from "./routes/admin-products.routes.js";
import adminOrdersRoutes from "./routes/admin-orders.routes.js";

const app = createApp({ middleware: [auth.tenantMiddleware, auth.tenantAccessMiddleware, requestId(), securityHeaders()] });
app.routes(healthRoutes);
app.routes(notesRoutes);
app.routes(authRoutes);
app.routes(auth.adminRoutes);
app.routes(auth.tenancyRoutes);
app.routes(adminProductsRoutes);
app.routes(adminOrdersRoutes);

export default app;
