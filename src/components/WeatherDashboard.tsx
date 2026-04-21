import React, { useEffect, useState } from 'react';

type WeatherData = {
    current: {
        temperature: number;
        weather: string;
    };
    hourly: Array<{
        time: string;
        temperature: number;
    }>
    weekly: Array<{
        time: string;
        temperature: number;
    }>
};

const WeatherDashboard: React.FC = () => {
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchWeatherData = async () => {
            try {
                const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=35.6895&longitude=139.6917&current_weather=true&hourly=temperature_2m&daily=temperature_2m_max,temperature_2m_min');
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data: WeatherData = await response.json();
                setWeatherData(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            }
        };
        fetchWeatherData();
    }, []);

    if (error) {
        return <div className="text-red-500">Error: {error}</div>;
    }

    if (!weatherData) {
        return <div>Loading...</div>;
    }

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold">Weather Dashboard</h1>
            <h2 className="text-lg">Current Weather</h2>
            <p>Temperature: {weatherData.current.temperature}°C</p>
            <p>Condition: {weatherData.current.weather}</p>
            <h2 className="text-lg">Hourly Forecast</h2>
            <ul>
                {weatherData.hourly.map((hour, index) => (
                    <li key={index}>
                        {hour.time}: {hour.temperature}°C
                    </li>
                ))}
            </ul>
            <h2 className="text-lg">Weekly Forecast</h2>
            <ul>
                {weatherData.weekly.map((day, index) => (
                    <li key={index}>
                        {day.time}: {day.temperature}°C
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default WeatherDashboard;
