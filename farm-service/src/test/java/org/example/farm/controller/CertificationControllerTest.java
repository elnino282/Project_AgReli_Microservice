package org.example.farm.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.farm.config.TestSecurityConfig;
import org.example.farm.config.CurrentUserService;
import org.example.farm.dto.request.UpdateCertificationItemRequest;
import org.example.farm.entity.*;
import org.example.farm.repository.*;
import org.example.farm.client.SeasonServiceClient;
import org.example.farm.client.SustainabilityServiceClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
public class CertificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private FarmRepository farmRepository;

    @Autowired
    private PlotRepository plotRepository;

    @Autowired
    private ProvinceRepository provinceRepository;

    @Autowired
    private WardRepository wardRepository;

    @Autowired
    private CertificationStandardRepository standardRepository;

    @Autowired
    private CertificationChecklistItemRepository checklistItemRepository;

    @Autowired
    private CertificationRecordRepository recordRepository;

    @Autowired
    private CertificationItemStatusRepository itemStatusRepository;

    @Autowired
    private CertificationScopeRepository scopeRepository;

    @MockBean
    private CurrentUserService currentUserService;

    @MockBean
    private SeasonServiceClient seasonServiceClient;

    @MockBean
    private SustainabilityServiceClient sustainabilityServiceClient;

    private Farm farm;
    private Plot plot;
    private CertificationStandard standard;
    private CertificationChecklistItem item1;
    private CertificationChecklistItem item2;

    @BeforeEach
    public void setUp() {
        scopeRepository.deleteAll();
        itemStatusRepository.deleteAll();
        recordRepository.deleteAll();
        checklistItemRepository.deleteAll();
        standardRepository.deleteAll();
        plotRepository.deleteAll();
        farmRepository.deleteAll();
        wardRepository.deleteAll();
        provinceRepository.deleteAll();

        // 0. Tạo Province & Ward
        Province province = Province.builder()
                .id(79)
                .name("Thành phố Hồ Chí Minh")
                .slug("thanh-pho-ho-chi-minh")
                .type("Thành phố Trung ương")
                .nameWithType("Thành phố Hồ Chí Minh")
                .build();
        province = provinceRepository.save(province);

        Ward ward = Ward.builder()
                .id(27682)
                .name("Tân Thạnh Đông")
                .slug("tan-thanh-dong")
                .type("Xã")
                .nameWithType("Xã Tân Thạnh Đông")
                .province(province)
                .build();
        ward = wardRepository.save(ward);

        // 1. Tạo Farm
        farm = Farm.builder()
                .name("Nông Trại VietGAP Mẫu")
                .province(province)
                .ward(ward)
                .area(BigDecimal.valueOf(10.0))
                .latitude(BigDecimal.valueOf(10.123456))
                .longitude(BigDecimal.valueOf(106.123456))
                .userId(1L)
                .active(true)
                .build();
        farm = farmRepository.save(farm);
        when(currentUserService.getCurrentUserId()).thenReturn(1L);

        // 2. Tạo Plot
        plot = Plot.builder()
                .farm(farm)
                .plotName("Lô Đất Số 1")
                .area(BigDecimal.valueOf(1.5))
                .status("IN_USE")
                .createdBy(1L)
                .build();
        plot = plotRepository.save(plot);

        // 3. Tạo Standard
        standard = CertificationStandard.builder()
                .code("VIETGAP-PLANTING-2026")
                .name("VietGAP Trồng trọt 2024")
                .type("VIETGAP_PLANTING")
                .version("1.0")
                .isActive(true)
                .build();
        standard = standardRepository.save(standard);

        // 4. Tạo Checklist Items
        item1 = CertificationChecklistItem.builder()
                .standardId(standard.getId())
                .itemCode("CHECK-01")
                .category("ĐẤT")
                .description("Kiểm nghiệm mẫu đất")
                .isMandatory(true)
                .weightPct(BigDecimal.valueOf(50.0))
                .dataSourceType("SOIL_TEST")
                .build();
        item1 = checklistItemRepository.save(item1);

        item2 = CertificationChecklistItem.builder()
                .standardId(standard.getId())
                .itemCode("CHECK-02")
                .category("LOGS")
                .description("Ghi chép Seeding")
                .isMandatory(true)
                .weightPct(BigDecimal.valueOf(50.0))
                .dataSourceType("FIELD_LOG")
                .dataSourceQuery("SEEDING")
                .build();
        item2 = checklistItemRepository.save(item2);
    }

    @Test
    public void farmerCannotReadAnotherFarmCertificationDossier() throws Exception {
        when(currentUserService.getCurrentUserId()).thenReturn(999L);

        mockMvc.perform(get("/api/v1/farms/" + farm.getId() + "/certification"))
                .andExpect(status().isForbidden());
    }

    @Test
    public void testCertificationWorkflow() throws Exception {
        // Mock Feign calls
        // Mock seasons list for plot
        SeasonServiceClient.SeasonSummaryDto mockSeason = SeasonServiceClient.SeasonSummaryDto.builder()
                .id(100)
                .seasonName("Vụ Đông Xuân")
                .plotId(plot.getId())
                .status("ACTIVE")
                .build();
        when(seasonServiceClient.getSeasonsByPlotId(plot.getId())).thenReturn(List.of(mockSeason));

        // Mock soil test list
        SustainabilityServiceClient.SoilTestInternalDto mockSoil = SustainabilityServiceClient.SoilTestInternalDto.builder()
                .id(200)
                .seasonId(100)
                .measured(true)
                .build();
        when(sustainabilityServiceClient.getSoilTestsInternal(100)).thenReturn(List.of(mockSoil));

        // Mock field logs count (SEEDING) -> return 0 (PENDING)
        when(seasonServiceClient.countFieldLogsByTypeInternal(eq(100), eq("SEEDING"))).thenReturn(0L);

        // 1. Create the dossier. Without a product/plot scope it must remain ineligible.
        mockMvc.perform(get("/api/v1/farms/" + farm.getId() + "/certification")
                        .header("X-User-Id", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.result.complianceScore").value(0.0))
                .andExpect(jsonPath("$.result.isEligible").value(false));

        CertificationRecord record = recordRepository
                .findByFarmIdAndStandardId(farm.getId(), standard.getId()).orElseThrow();
        scopeRepository.save(CertificationScope.builder()
                .recordId(record.getId()).seasonId(100)
                .plotId(plot.getId()).plotName(plot.getPlotName())
                .cropId(1).cropName("Lua")
                .registeredAreaHa(BigDecimal.ONE)
                .expectedYieldKg(BigDecimal.valueOf(1000)).build());

        // 2. Only evidence from the scoped season is scored.
        mockMvc.perform(get("/api/v1/farms/" + farm.getId() + "/certification")
                        .header("X-User-Id", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.complianceScore").value(50.0))
                .andExpect(jsonPath("$.result.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.result.isEligible").value(false));

        // 3. Try to Apply -> should return HTTP 400 because score is 50% (< 80%)
        mockMvc.perform(post("/api/v1/farms/" + farm.getId() + "/certification/apply")
                        .header("X-User-Id", 1L))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("ERR_BAD_REQUEST"));

        // 4. Update Item 2 (SEEDING) to PASS manually
        UpdateCertificationItemRequest updateReq = UpdateCertificationItemRequest.builder()
                .status("PASS")
                .notes("Đã cập nhật thủ công")
                .build();

        mockMvc.perform(put("/api/v1/farms/" + farm.getId() + "/certification/items/" + item2.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq))
                        .header("X-User-Id", 1L))
                .andExpect(status().isOk());

        // 5. GET Certification Details again -> score should now be 100%
        mockMvc.perform(get("/api/v1/farms/" + farm.getId() + "/certification")
                        .header("X-User-Id", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.complianceScore").value(100.0))
                .andExpect(jsonPath("$.result.status").value("READY_TO_APPLY"))
                .andExpect(jsonPath("$.result.isEligible").value(true));

        // 6. Apply now -> should succeed
        mockMvc.perform(post("/api/v1/farms/" + farm.getId() + "/certification/apply")
                        .header("X-User-Id", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value("Đã nộp đơn xin chứng nhận VietGAP thành công"));
    }
}
