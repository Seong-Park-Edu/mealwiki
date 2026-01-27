using Server.Services;
using Supabase;

var builder = WebApplication.CreateBuilder(args);

// 1. 서비스 컨테이너에 기능 등록
builder.Services.AddControllers();

// Swagger 설정 (API 테스트 문서 자동 생성)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 카카오 서비스 등록 (HttpClient 사용)
builder.Services.AddHttpClient<KakaoService>();

// Supabase 클라이언트 등록
// (나중에 Azure 사이트 설정에 'Supabase:Url'과 'Supabase:Key'를 입력하면 여기서 자동으로 읽어옵니다!)
var url = builder.Configuration["Supabase:Url"];
var key = builder.Configuration["Supabase:Key"];

builder.Services.AddScoped<Supabase.Client>(_ =>
    new Supabase.Client(url, key, new Supabase.SupabaseOptions
    {
        AutoRefreshToken = true,
        AutoConnectRealtime = true
    }));

// ★ [수정됨] CORS 설정: 일단 배포 성공을 위해 "모두 허용"으로 변경
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowMealWikiDomains", policy =>
    {
        // 허용할 도메인들을 리스트로 작성합니다.
        policy.WithOrigins(
                "https://mealwiki.com",           // 구입하신 커스텀 도메인
                "https://mealwiki.vercel.app", // Vercel 기본 도메인
                "http://localhost:5173"         // 로컬 개발 환경
              )
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();



app.UseSwagger();
app.UseSwaggerUI();

app.UseRouting();

// ★ 위에서 만든 "AllowMealWikiDomains" 정책 적용
app.UseCors("AllowMealWikiDomains");

app.UseHttpsRedirection();


app.UseAuthorization();

app.MapControllers();

// ★ Azure가 알아서 포트를 넣어줍니다. (괄호 비워두는 게 정석!)
app.Run();