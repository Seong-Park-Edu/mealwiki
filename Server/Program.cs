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
    options.AddPolicy("AllowAll", // 이름도 'AllowAll'로 바꿈
        policy =>
        {
            policy.AllowAnyOrigin()  // 누구든지 들어오세요! (Vercel 주소 몰라도 됨)
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        });
});

var app = builder.Build();



app.UseSwagger();
app.UseSwaggerUI();

// ★ 위에서 만든 "AllowAll" 정책 적용
app.UseCors("AllowAll");

app.UseHttpsRedirection();


app.UseAuthorization();

app.MapControllers();

// ★ Azure가 알아서 포트를 넣어줍니다. (괄호 비워두는 게 정석!)
app.Run();