import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { FarmerGettingStartedGuide } from "./FarmerGettingStartedGuide";

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

function renderGuide(route = "/farmer/documents?section=guide") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <FarmerGettingStartedGuide />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("FarmerGettingStartedGuide", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts with a short onboarding path and the beginner topic open", () => {
    renderGuide();

    expect(screen.getByText("Khởi động trong khoảng 15 phút")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bắt đầu đúng cách" })).toBeInTheDocument();
    expect(screen.getByText("Các bước thực hiện")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Đánh dấu hoàn thành/ })).toHaveLength(5);
  });

  it("finds topics without requiring Vietnamese diacritics", async () => {
    renderGuide();

    fireEvent.change(screen.getByRole("textbox", { name: "Tìm trong hướng dẫn farmer" }), {
      target: { value: "thuoc phi" },
    });

    expect(
      screen.getByRole("button", { name: /Thuốc BVTV và thời gian cách ly PHI/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Nông trại và thửa đất/ })).not.toBeInTheDocument();
  });

  it("opens a selected workflow and stores it in the URL", async () => {
    renderGuide();

    fireEvent.click(screen.getByRole("button", { name: /Thu hoạch, đóng gói và nhập kho/ }));

    expect(screen.getByRole("heading", { name: "Thu hoạch, đóng gói và nhập kho" })).toBeInTheDocument();
    expect(screen.getByText("Kiểm tra cổng thu hoạch")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/farmer/documents?section=guide&topic=harvest",
    );
  });

  it("persists quick-start progress on the current device", async () => {
    renderGuide();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Đánh dấu hoàn thành: Xem việc cần làm hôm nay",
      }),
    );

    expect(screen.getByText("1/5")).toBeInTheDocument();
    await waitFor(() => {
      expect(window.localStorage.getItem("agreli_farmer_guide_progress_v1")).toContain(
        "dashboard",
      );
    });
  });
});
