package org.example.apigateway;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.route.RouteLocator;

import java.util.List;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class GatewayRoutingTest {

    @Autowired
    private RouteLocator routeLocator;

    @Test
    void testAdminReportingRoutesAreCutOver() {
        List<Route> routes = routeLocator.getRoutes().collectList().block();
        assertThat(routes).isNotEmpty();

        System.out.println("=== API Gateway Routing Configuration ===");
        routes.forEach(route -> System.out.println("Route ID: " + route.getId() + " -> URI: " + route.getUri()));

        // 1. Verify admin-reporting-route points to reporting service
        Route adminReportingRoute = routes.stream()
                .filter(r -> "admin-reporting-route".equals(r.getId()))
                .findFirst()
                .orElse(null);
        assertThat(adminReportingRoute).isNotNull();
        assertThat(adminReportingRoute.getUri().toString()).contains("8091");

        // 2. Verify admin-reporting-documents-route points to reporting service (all methods)
        Route adminReportingDocsRoute = routes.stream()
                .filter(r -> "admin-reporting-documents-route".equals(r.getId()))
                .findFirst()
                .orElse(null);
        assertThat(adminReportingDocsRoute).isNotNull();
        assertThat(adminReportingDocsRoute.getUri().toString()).contains("8091");

        // 3. Verify admin-reporting-reads-route points to reporting service
        Route adminReportingReadsRoute = routes.stream()
                .filter(r -> "admin-reporting-reads-route".equals(r.getId()))
                .findFirst()
                .orElse(null);
        assertThat(adminReportingReadsRoute).isNotNull();
        assertThat(adminReportingReadsRoute.getUri().toString()).contains("8091");

        // 4. Certification workflow commands and admin queue belong to farm-service.
        Route farmCertificationRoute = routes.stream()
                .filter(r -> "farm-certification-route".equals(r.getId()))
                .findFirst()
                .orElse(null);
        assertThat(farmCertificationRoute).isNotNull();
        assertThat(farmCertificationRoute.getUri().toString()).contains("8084");
    }
}
