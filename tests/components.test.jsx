import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AQIGauge from '../src/components/AQIGauge.jsx';
import IndoorAir from '../src/components/IndoorAir.jsx';
import EcoImpact from '../src/components/EcoImpact.jsx';
import AuthModal from '../src/components/AuthModal.jsx';
import Dashboard from '../src/components/Dashboard.jsx';
import ChatAssistant from '../src/components/ChatAssistant.jsx';
import ErrorBoundary from '../src/components/ErrorBoundary.jsx';

describe('React Components & Accessibility Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('AQIGauge communicates status with text, icon, and ARIA label (not color alone)', () => {
    render(<AQIGauge aqi={178} />);
    const gauge = screen.getByRole('img', { name: /US Air Quality Index is 178, rated Poor/i });
    expect(gauge).toBeInTheDocument();
    expect(screen.getAllByText('Poor').length).toBeGreaterThanOrEqual(1);
  });

  it('AQIGauge renders Unavailable clearly when reading is missing', () => {
    render(<AQIGauge aqi={null} />);
    expect(screen.getByRole('img', { name: /unavailable/i })).toBeInTheDocument();
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThanOrEqual(1);
  });

  it('IndoorAir marks indoor readings Unavailable unless a user sensor PM2.5 is entered', () => {
    render(<IndoorAir airQuality={{ location: 'New Delhi, India', aqi: 180, pm25: 90, windSpeed: 5, humidity: 65, isLive: true }} />);
    expect(screen.getByText(/Indoor Sensor Not Connected/i)).toBeInTheDocument();
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThanOrEqual(1);

    const sensorInput = screen.getByLabelText(/Enter home PM2.5 sensor reading/i);
    fireEvent.change(sensorInput, { target: { value: '20' } });
    expect(screen.getByText('User Indoor Monitor Reading')).toBeInTheDocument();
    expect(screen.getByText(/20 µg\/m³ measured indoors/i)).toBeInTheDocument();
  });

  it('EcoImpact carbon footprint calculator updates emissions dynamically', () => {
    render(<EcoImpact />);
    expect(screen.getByText(/Interactive Carbon Footprint/i)).toBeInTheDocument();
    const initialText = screen.getAllByText(/kg CO₂$/i)[0].textContent;

    const select = screen.getByDisplayValue('Private Car');
    fireEvent.change(select, { target: { value: 'metro' } });
    const updatedText = screen.getAllByText(/kg CO₂$/i)[0].textContent;
    expect(updatedText).not.toBe(initialText);
  });

  it('AuthModal supports accessible dialog attributes, mode switching, and Escape close', () => {
    const onClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={onClose} onAuthSuccess={vi.fn()} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');

    fireEvent.click(screen.getByText('Create account'));
    expect(screen.getByText('Create your free account')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('Dashboard renders unavailable state with Retry when offline and full telemetry when live', () => {
    const onRefresh = vi.fn();
    const { rerender } = render(
      <Dashboard
        airQuality={{ location: 'London, UK', isLive: false, aqi: null }}
        onSelectCity={vi.fn()}
        onRefresh={onRefresh}
        onRequestLocation={vi.fn()}
        isLoadingCity={false}
        apiError="Upstream unavailable"
        preferences={{ alertThreshold: 150 }}
        formatTemp={(c) => `${c}°C`}
        onNavigate={vi.fn()}
        onSaveLocation={vi.fn()}
        isLocationSaved={false}
      />
    );
    expect(screen.getByText(/Live Measurements Unavailable/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Retry Live Fetch/i));
    expect(onRefresh).toHaveBeenCalledTimes(1);

    rerender(
      <Dashboard
        airQuality={{
          location: 'London, UK',
          isLive: true,
          isStale: true,
          staleReason: 'Showing cached snapshot',
          aqi: 42,
          pm25: 10.5,
          pm10: 21.0,
          no2: 18.2,
          o3: 32.0,
          co: 0.4,
          so2: 3.1,
          temperature: 12,
          feelsLike: 10,
          humidity: 70,
          windSpeed: 15,
          windDirection: 'W (270°)',
          pressure: 1015,
          uvIndex: 2.0,
          weatherCondition: 'Partly cloudy',
          dataSource: 'Open-Meteo Live',
          stationLabel: 'Copernicus CAMS Grid',
          lastUpdated: new Date().toISOString(),
          hourlyData: [{ hour: '10AM', aqi: 42 }],
          trendData: [{ day: 'Mon', aqi: 40 }],
          dailyForecast: [],
        }}
        onSelectCity={vi.fn()}
        onRefresh={onRefresh}
        onRequestLocation={vi.fn()}
        isLoadingCity={false}
        apiError={null}
        preferences={{ alertThreshold: 150 }}
        formatTemp={(c) => `${c}°C`}
        onNavigate={vi.fn()}
        onSaveLocation={vi.fn()}
        isLocationSaved={false}
      />
    );

    expect(screen.getByText(/Showing cached snapshot/i)).toBeInTheDocument();
    expect(screen.getByText(/W \(270°\)/)).toBeInTheDocument();
    expect(screen.getByText(/1015 hPa/)).toBeInTheDocument();
  });

  it('ChatAssistant sends user question to backend AI endpoint and renders source-aware reply', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            response: 'PM2.5 is currently 12 µg/m³ in Tokyo, within WHO safe range.',
            engine: 'BreatheBetter Live Context Engine',
            timestamp: new Date().toISOString(),
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );

    render(
      <ChatAssistant
        airQuality={{
          location: 'Tokyo, Japan',
          aqi: 45,
          pm25: 12,
          pm10: 20,
          o3: 30,
          temperature: 14,
          windSpeed: 12,
          isLive: true,
          dataSource: 'Open-Meteo Live',
          hourlyData: [{ hour: '2PM', aqi: 40 }],
        }}
        userProfile={{ type: 'Student' }}
      />
    );

    const textarea = screen.getByPlaceholderText(/Ask about outdoor safety/i);
    fireEvent.change(textarea, { target: { value: 'What does PM2.5 mean?' } });
    fireEvent.click(screen.getByLabelText('Send message'));

    await waitFor(() => {
      expect(screen.getByText(/PM2\.5 is currently 12/i)).toBeInTheDocument();
    });
  });

  it('ErrorBoundary catches child rendering crash and resets cleanly', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Crash = ({ shouldCrash }) => {
      if (shouldCrash) throw new Error('Simulated crash');
      return <div>Recovered UI</div>;
    };

    const { rerender } = render(
      <ErrorBoundary>
        <Crash shouldCrash={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    rerender(
      <ErrorBoundary>
        <Crash shouldCrash={false} />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByText(/Reload Section/i));
    expect(screen.getByText('Recovered UI')).toBeInTheDocument();
    spy.mockRestore();
  });
});
