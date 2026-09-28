import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  // 메인 모드 선택 ('main' | 'rental' | 'return' | 'report' | 'stamp' | 'extension' | 'share')
  const [activeTab, setActiveTab] = useState<'main' | 'rental' | 'return' | 'report' | 'stamp' | 'extension' | 'share'>('main');

  // 대여 관련 상태
  const [selectedBook, setSelectedBook] = useState<string | null>(null);     
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null); 
  const [step1Password, setStep1Password] = useState<string | null>(null);   
  const [step2Password, setStep2Password] = useState<string | null>(null);   
  const [authStep, setAuthStep] = useState<string>('대기중');                 
  const [bookSearchQuery, setBookSearchQuery] = useState<string>(''); // 도서 검색어 상태

  // 반납 관련 상태
  const [returnStep1Password, setReturnStep1Password] = useState<string | null>(null);
  const [returnStep2Password, setReturnStep2Password] = useState<string | null>(null);
  const [returnStep, setReturnStep] = useState<string>('대기중');

  // 공통 및 유저 상태
  const [rentedBook, setRentedBook] = useState<string | null>(null); // 대여 중인 도서
  const [userPoints, setUserPoints] = useState<number>(1250);        // 우측 상단 상시 표시 포인트
  const [extensionCount, setExtensionCount] = useState<number>(0);           
  const [isPenalized, setIsPenalized] = useState<boolean>(false);             

  // 친구 추천 및 이벤트 관련 상태 (추천 보상 100P, 무한 양방향)
  const [myReferralCode] = useState<string>('IT-BOOK-7789');
  const [inputReferralCode, setInputReferralCode] = useState<string>('');

  // 타이머 관련 상태 (60초 제한)
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);

  // 스탬프 및 쿠폰함 상태 (쿠폰 기본 1장 보유)
  const [stampCount, setStampCount] = useState<number>(7);         
  const [couponCount, setCouponCount] = useState<number>(1);       
  const [reportContent, setReportContent] = useState<string>('');   
  const [photoAttached, setPhotoAttached] = useState<boolean>(false); 
  const [currentDateTime, setCurrentDateTime] = useState<string>(''); 

  // 도서 리스트 데이터 정의
  const box1Books = ['자바 프로그래밍', '대학 국어와 글쓰기', '소프트웨어공학 개론', '자료구조 및 알고리즘'];
  const box2Books = ['정보처리기사 실기 수험서', 'SQLD 개발자 가이드', '리눅스마스터 2급', '네트워크관리사 2급'];

  // 검색어에 따른 필터링된 도서 목록 계산
  const filteredBox1 = box1Books.filter(book => book.toLowerCase().includes(bookSearchQuery.toLowerCase()));
  const filteredBox2 = box2Books.filter(book => book.toLowerCase().includes(bookSearchQuery.toLowerCase()));

  // 실시간 일시 자동 생성
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setCurrentDateTime(`${year}-${month}-${day} ${hours}:${minutes}`);
  }, []);

  // 타이머 훅
  useEffect(() => {
    let timer: any;
    if (isTimerActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerActive) {
      setIsTimerActive(false);
      resetAllAuth();
      Alert.alert("⏰ 인증 시간 초과", "제한 시간이 초과되어 안전을 위해 세션이 자동 취소되었습니다.");
    }
    return () => clearInterval(timer);
  }, [isTimerActive, timeLeft]);

  // 인증 상태 초기화
  const resetAllAuth = () => {
    setSelectedBook(null);
    setSelectedTicket(null);
    setStep1Password(null);
    setStep2Password(null);
    setAuthStep('대기중');
    setReturnStep1Password(null);
    setReturnStep2Password(null);
    setReturnStep('대기중');
    setIsTimerActive(false);
    setTimeLeft(60);
    setBookSearchQuery('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* 1. 상단 타이틀 및 우측 상단 포인트 상시 표시 영역 */}
        <ThemedView style={styles.headerBox}>
          <ThemedView style={styles.headerRow}>
            <ThemedView style={{ flex: 1 }}>
              <ThemedText type="title" style={styles.mainTitle}>IT융합대학 스마트 플랫폼</ThemedText>
              <ThemedText type="default" style={styles.subTitle}>무인 도서 대여 및 살균 보관 시스템</ThemedText>
            </ThemedView>
            
            {/* 우측 상단 포인트 배지 */}
            <ThemedView style={styles.pointBadgeBox}>
              <ThemedText style={styles.pointTitleText}>⭐ 내 포인트</ThemedText>
              <ThemedText style={styles.pointValueText}>{userPoints.toLocaleString()} P</ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>

        {/* 메인 홈 화면 */}
        {activeTab === 'main' && (
          <ThemedView>
            {/* 핵심 대여 / 반납 메인 툴 버튼 */}
            <ThemedView style={styles.mainToolGrid}>
              <TouchableOpacity 
                style={styles.bigToolButtonRental} 
                onPress={() => { resetAllAuth(); setActiveTab('rental'); }}
              >
                <ThemedText style={styles.bigToolEmoji}>📦</ThemedText>
                <ThemedText style={styles.bigToolTitle}>도서 대여하기</ThemedText>
                <ThemedText style={styles.bigToolDesc}>보관함 선택 및 보안 인증 (100P / 쿠폰 가능)</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.bigToolButtonReturn} 
                onPress={() => {
                  if (!rentedBook) {
                    Alert.alert("알림", "현재 대여 중인 도서가 없습니다.");
                    return;
                  }
                  resetAllAuth();
                  setActiveTab('return');
                }}
              >
                <ThemedText style={styles.bigToolEmoji}>🔄</ThemedText>
                <ThemedText style={styles.bigToolTitle}>도서 반납하기</ThemedText>
                <ThemedText style={styles.bigToolDesc}>{rentedBook ? `대여중: ${rentedBook}` : '반납 대상 없음'}</ThemedText>
              </TouchableOpacity>
            </ThemedView>

            {/* 친구 추천 & 플랫폼 공유 이벤트 배너 */}
            <TouchableOpacity 
              style={styles.eventBannerBox}
              onPress={() => setActiveTab('share')}
            >
              <ThemedView style={{ backgroundColor: 'transparent', flex: 1 }}>
                <ThemedText style={styles.eventBannerBadge}>🎁 특별 이벤트</ThemedText>
                <ThemedText style={styles.eventBannerTitle}>친구 초대하고 +100P 양방향 적립!</ThemedText>
                <ThemedText style={styles.eventBannerSub}>추천 코드 입력 시 나와 친구 모두에게 즉시 지급!</ThemedText>
              </ThemedView>
              <ThemedText style={styles.eventBannerArrow}>➔</ThemedText>
            </TouchableOpacity>

            {/* 보조 관리 툴 버튼 그룹 */}
            <ThemedView style={styles.sectionBox}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>🛠️ 부가 시스템 및 관리 툴</ThemedText>
              
              <View style={styles.subToolGrid}>
                <TouchableOpacity style={styles.subToolButton} onPress={() => setActiveTab('extension')}>
                  <ThemedText style={styles.subToolButtonText}>⏳ 대여 연장/패널티</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity style={styles.subToolButton} onPress={() => setActiveTab('stamp')}>
                  <ThemedText style={styles.subToolButtonText}>⭐ 스탬프 & 쿠폰함 ({couponCount})</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity style={styles.subToolButton} onPress={() => setActiveTab('share')}>
                  <ThemedText style={styles.subToolButtonText}>📢 친구추천/공유</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity style={styles.subToolButton} onPress={() => setActiveTab('report')}>
                  <ThemedText style={styles.subToolButtonText}>📸 분실/파손 신고</ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </ThemedView>
        )}

        {/* [하위 툴 1] 도서 대여 서브 화면 (검색창 추가됨) */}
        {activeTab === 'rental' && (
          <ThemedView style={styles.sectionBox}>
            <TouchableOpacity style={styles.backButton} onPress={() => { resetAllAuth(); setActiveTab('main'); }}>
              <ThemedText style={styles.backButtonText}>⬅️ 메인 메뉴로 돌아가기</ThemedText>
            </TouchableOpacity>

            <ThemedText type="subtitle" style={styles.sectionTitle}>📦 도서 대여 프로세스</ThemedText>
            <ThemedText style={styles.descText}>원하시는 도서와 이용권을 선택하세요. (100P 차감 또는 보유 쿠폰으로 무료 대여 가능)</ThemedText>

            {/* 🔍 전공책 및 수험서 검색창 추가 */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="🔍 찾으시는 도서명이나 키워드를 검색하세요..."
                placeholderTextColor="#7f8c8d"
                value={bookSearchQuery}
                onChangeText={setBookSearchQuery}
              />
              {bookSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setBookSearchQuery('')} style={styles.clearSearchBtn}>
                  <ThemedText style={{ color: '#aaa', fontSize: 12 }}>✕ 초기화</ThemedText>
                </TouchableOpacity>
              )}
            </View>

            {/* 제 1보관함 */}
            {filteredBox1.length > 0 && (
              <ThemedView style={styles.boxContainer}>
                <ThemedView style={styles.boxHeaderRow}>
                  <ThemedText style={styles.boxTitle}>✨ 제 1보관함 (IT 전공/교양 서적)</ThemedText>
                  <ThemedText style={styles.sterilizationBadge}>UV-C 살균율 99.9%</ThemedText>
                </ThemedView>
                
                {filteredBox1.map(book => (
                  <TouchableOpacity 
                    key={book}
                    style={[styles.bookItemButton, selectedBook === book && styles.selectedBookItem]}
                    onPress={() => setSelectedBook(book)}
                  >
                    <ThemedText style={styles.bookItemText}>📖 {book}</ThemedText>
                  </TouchableOpacity>
                ))}
              </ThemedView>
            )}

            {/* 제 2보관함 */}
            {filteredBox2.length > 0 && (
              <ThemedView style={styles.boxContainer}>
                <ThemedView style={styles.boxHeaderRow}>
                  <ThemedText style={styles.boxTitle}>✨ 제 2보관함 (IT 계열 자격증)</ThemedText>
                  <ThemedText style={styles.sterilizationBadge2}>UV-C 살균율 99.5%</ThemedText>
                </ThemedView>

                {filteredBox2.map(book => (
                  <TouchableOpacity 
                    key={book}
                    style={[styles.bookItemButton, selectedBook === book && styles.selectedBookItem]}
                    onPress={() => setSelectedBook(book)}
                  >
                    <ThemedText style={styles.bookItemText}>📖 {book}</ThemedText>
                  </TouchableOpacity>
                ))}
              </ThemedView>
            )}

            {filteredBox1.length === 0 && filteredBox2.length === 0 && (
              <ThemedView style={{ padding: 20, alignItems: 'center' }}>
                <ThemedText style={{ color: '#9ba1a6', fontSize: 13 }}>검색 결과가 없습니다. 다른 검색어를 입력해보세요!</ThemedText>
              </ThemedView>
            )}

            {selectedBook && (
              <ThemedView style={{ marginTop: 10 }}>
                <ThemedText style={styles.statusText}>선택된 도서: [ {selectedBook} ]</ThemedText>
                
                {/* 이용권 선택 */}
                <ThemedText style={styles.descText}>이용권을 선택해주세요:</ThemedText>
                <ThemedView style={styles.ticketRow}>
                  {['시간권', '복습권', '종일권'].map(ticket => (
                    <TouchableOpacity 
                      key={ticket}
                      style={[styles.ticketButton, selectedTicket === ticket && styles.selectedTicket]}
                      onPress={() => setSelectedTicket(ticket)}
                    >
                      <ThemedText style={styles.buttonText}>{ticket}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </ThemedView>
              </ThemedView>
            )}

            {/* 1차 비번 발급 버튼 (포인트 차감 방식 vs 쿠폰 무료 대여 방식 분기) */}
            {selectedBook && selectedTicket && !step1Password && (
              <ThemedView style={{ marginTop: 8, gap: 8 }}>
                {/* 1. 포인트 차감 대여 버튼 (100P) */}
                <TouchableOpacity 
                  style={styles.rentalConfirmButton}
                  onPress={() => {
                    if (userPoints < 100) {
                      Alert.alert("⚠️ 포인트 부족", "대여 비용(100P)이 부족합니다.\n보유 중인 쿠폰을 사용하거나 친구 초대 이벤트를 이용해주세요!");
                      return;
                    }
                    const pin = String(Math.floor(Math.random() * 90) + 10);
                    setStep1Password(pin);
                    setAuthStep('1차 인증 대기중 (100P 차감)');
                    setTimeLeft(60);
                    setIsTimerActive(true);
                    Alert.alert("🔒 1차 비밀번호 발급", `키패드 입력용 2자리: [ ${pin} ] (60초 제한)`);
                  }}
                >
                  <ThemedText style={styles.buttonText}>💰 포인트로 대여하기 (100P 차감)</ThemedText>
                </TouchableOpacity>

                {/* 2. 쿠폰 보유 시 무료 대여 버튼 */}
                <TouchableOpacity 
                  style={[styles.couponRentalButton, couponCount <= 1 && { backgroundColor: '#8e44ad' }]}
                  onPress={() => {
                    if (couponCount <= 0) {
                      Alert.alert("알림", "사용 가능한 쿠폰이 없습니다. 스탬프를 완성하거나 이벤트를 이용하세요!");
                      return;
                    }
                    setCouponCount(prev => prev - 1);
                    const pin = String(Math.floor(Math.random() * 90) + 10);
                    setStep1Password(pin);
                    setAuthStep('1차 인증 대기중 (쿠폰 무료 대여)');
                    setTimeLeft(60);
                    setIsTimerActive(true);
                    Alert.alert("🎟️ 쿠폰 적용 완료", `쿠폰 1장이 소모되었습니다!\n키패드 입력용 2자리: [ ${pin} ] (60초 제한)`);
                  }}
                >
                  <ThemedText style={styles.buttonText}>🎟️ 보유 쿠폰 사용하기 (무료 대여 / 잔여: {couponCount}장)</ThemedText>
                </TouchableOpacity>
              </ThemedView>
            )}

            {/* 인증 진행 */}
            {step1Password && (
              <ThemedView style={styles.authBox}>
                <ThemedText style={styles.authTitle}>상태: {authStep} (남은 시간: {timeLeft}초)</ThemedText>
                <ThemedText style={styles.authDesc}>1차 비밀번호: <ThemedText style={styles.highlightText}>{step1Password}</ThemedText></ThemedText>

                {!step2Password ? (
                  <TouchableOpacity 
                    style={styles.step2Button}
                    onPress={() => {
                      const finalPin = String(Math.floor(Math.random() * 9000) + 1000);
                      setStep2Password(finalPin);
                      setAuthStep('2차 인증 완료');
                      
                      if (authStep.includes('100P')) {
                        setUserPoints(prev => prev - 100);
                      }

                      setRentedBook(selectedBook);

                      Alert.alert("🎉 대여 성공", `2차 PIN: [ ${finalPin} ]\n보관함 문이 열렸습니다.`);
                    }}
                  >
                    <ThemedText style={styles.buttonText}>⚡ 키패드 1차 입력 완료 및 2차 PIN 받기</ThemedText>
                  </TouchableOpacity>
                ) : (
                  <ThemedView>
                    <ThemedText style={styles.authDesc}>최종 오픈 PIN: <ThemedText style={styles.highlightText}>{step2Password}</ThemedText></ThemedText>
                    <TouchableOpacity 
                      style={styles.doorCloseButton}
                      onPress={() => {
                        Alert.alert("🚪 도어 닫힘 감지", "문 닫힘이 감지 되었습니다. 메인으로 돌아갑니다.");
                        resetAllAuth();
                        setActiveTab('main');
                      }}
                    >
                      <ThemedText style={styles.buttonText}>🔒 문 닫힘 감지 (완료 및 초기화)</ThemedText>
                    </TouchableOpacity>
                  </ThemedView>
                )}
              </ThemedView>
            )}
          </ThemedView>
        )}

        {/* [하위 툴 2] 도서 반납 서브 화면 */}
        {activeTab === 'return' && (
          <ThemedView style={styles.sectionBox}>
            <TouchableOpacity style={styles.backButton} onPress={() => { resetAllAuth(); setActiveTab('main'); }}>
              <ThemedText style={styles.backButtonText}>⬅️ 메인 메뉴로 돌아가기</ThemedText>
            </TouchableOpacity>

            <ThemedText type="subtitle" style={styles.sectionTitle}>🔄 도서 반납 프로세스</ThemedText>
            <ThemedText style={styles.statusText}>현재 대여 중인 도서: 📖 [ {rentedBook} ]</ThemedText>

            {!returnStep1Password && (
              <TouchableOpacity 
                style={styles.returnButton} 
                onPress={() => {
                  const returnPin = String(Math.floor(Math.random() * 90) + 10);
                  setReturnStep1Password(returnPin);
                  setReturnStep('반납 1차 인증 대기중');
                  setTimeLeft(60);
                  setIsTimerActive(true);
                  Alert.alert("🔒 반납 1차 비밀번호 발급", `반납 키패드 입력용 2자리: [ ${returnPin} ] (60초 제한)`);
                }}
              >
                <ThemedText style={styles.buttonText}>📥 반납 1차 인증 시작하기</ThemedText>
              </TouchableOpacity>
            )}

            {returnStep1Password && (
              <ThemedView style={styles.authBox}>
                <ThemedText style={styles.authTitle}>상태: {returnStep} (남은 시간: {timeLeft}초)</ThemedText>
                <ThemedText style={styles.authDesc}>반납 1차 비밀번호: <ThemedText style={styles.highlightText}>{returnStep1Password}</ThemedText></ThemedText>

                {!returnStep2Password ? (
                  <TouchableOpacity 
                    style={styles.step2Button}
                    onPress={() => {
                      const finalReturnPin = String(Math.floor(Math.random() * 9000) + 1000);
                      setReturnStep2Password(finalReturnPin);
                      setReturnStep('반납 2차 인증 완료');
                      Alert.alert("🎉 반납함 개방", `최종 PIN: [ ${finalReturnPin} ]\n도서를 끝까지 밀어 넣어 정리해주세요!`);
                    }}
                  >
                    <ThemedText style={styles.buttonText}>⚡ 반납 키패드 1차 입력 및 2차 PIN 받기</ThemedText>
                  </TouchableOpacity>
                ) : (
                  <ThemedView>
                    <ThemedText style={styles.authDesc}>반납함 최종 PIN: <ThemedText style={styles.highlightText}>{returnStep2Password}</ThemedText></ThemedText>
                    <TouchableOpacity 
                      style={styles.doorCloseButton}
                      onPress={() => {
                        setUserPoints(prev => prev + 100);
                        Alert.alert("📥 반납 완료", "문 닫힘이 감지 되었습니다.\n[딸깍 소리 인식] 리미트 스위치 정돈 완료 (+100P 적립)\nUV-C 살균 자동 실행!");
                        setRentedBook(null);
                        resetAllAuth();
                        setActiveTab('main');
                      }}
                    >
                      <ThemedText style={styles.buttonText}>🔒 문 닫힘 감지 (끝까지 밀어넣기 완료)</ThemedText>
                    </TouchableOpacity>
                  </ThemedView>
                )}
              </ThemedView>
            )}
          </ThemedView>
        )}

        {/* 친구 추천 및 플랫폼 공유 화면 */}
        {activeTab === 'share' && (
          <ThemedView style={styles.sectionBox}>
            <TouchableOpacity style={styles.backButton} onPress={() => setActiveTab('main')}>
              <ThemedText style={styles.backButtonText}>⬅️ 메인 메뉴로 돌아가기</ThemedText>
            </TouchableOpacity>

            <ThemedText type="subtitle" style={styles.sectionTitle}>🎁 친구 추천 & 양방향 100P 이벤트</ThemedText>
            <ThemedText style={styles.descText}>전용 코드를 공유하여 가입이 완료되면, 추천인과 추천받은 사람 모두에게 100P가 지급됩니다!</ThemedText>

            <ThemedView style={styles.referralCard}>
              <ThemedText style={styles.referralCardTitle}>내 전용 추천 코드</ThemedText>
              <ThemedText style={styles.referralCodeText}>{myReferralCode}</ThemedText>
              
              <TouchableOpacity 
                style={styles.referralActionBtnFull} 
                onPress={() => Alert.alert("📋 코드 복사 완료", `추천 코드 [ ${myReferralCode} ] 가 클립보드에 복사되었습니다.`)}
              >
                <ThemedText style={styles.referralActionText}>📋 내 추천 코드 복사하기</ThemedText>
              </TouchableOpacity>
            </ThemedView>

            <ThemedView style={styles.inputCodeBox}>
              <ThemedText style={styles.boxTitle}>초대받은 추천 코드가 있으신가요?</ThemedText>
              <ThemedText style={styles.descText}>코드를 입력하시면 나와 친구(코드 주인) 모두에게 즉시 100P가 적립됩니다.</ThemedText>
              
              <TextInput
                style={styles.textInputSingle}
                placeholder="추천 코드 입력 (예: IT-BOOK-1234)"
                placeholderTextColor="#7f8c8d"
                value={inputReferralCode}
                onChangeText={setInputReferralCode}
              />

              <TouchableOpacity 
                style={styles.submitButton}
                onPress={() => {
                  if (!inputReferralCode.trim()) {
                    Alert.alert("알림", "추천 코드를 입력해주세요.");
                    return;
                  }
                  if (inputReferralCode.trim() === myReferralCode) {
                    Alert.alert("알림", "본인의 추천 코드는 입력할 수 없습니다.");
                    return;
                  }
                  
                  setUserPoints(prev => prev + 100);
                  Alert.alert(
                    "🎉 양방향 적립 완료!", 
                    `추천 코드 [ ${inputReferralCode} ] 적용 완료!\n\n✨ 추천인에게 +100P 지급 완료\n✨ 본인에게 +100P 지급 완료`
                  );
                  setInputReferralCode('');
                }}
              >
                <ThemedText style={styles.buttonText}>🎁 추천인 코드 등록하고 100P 받기</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        )}

        {/* 대여 연장 및 패널티 관리 */}
        {activeTab === 'extension' && (
          <ThemedView style={styles.sectionBox}>
            <TouchableOpacity style={styles.backButton} onPress={() => setActiveTab('main')}>
              <ThemedText style={styles.backButtonText}>⬅️ 메인 메뉴로 돌아가기</ThemedText>
            </TouchableOpacity>
            <ThemedText type="subtitle" style={styles.sectionTitle}>⏳ 대여 연장 및 패널티 관리</ThemedText>
            <ThemedText style={styles.statusText}>현재 연장 횟수: {extensionCount}회 / 2회 {isPenalized ? '🔴 (패널티 적용됨)' : '🟢 (정상)'}</ThemedText>
            <TouchableOpacity 
              style={[styles.actionButton, isPenalized && styles.disabledButton]} 
              onPress={() => {
                if (isPenalized) return;
                if (extensionCount < 2) {
                  setExtensionCount(prev => prev + 1);
                  Alert.alert("연장 완료", `대여가 1시간 연장되었습니다. (${extensionCount + 1}/2회)`);
                } else {
                  setIsPenalized(true);
                  Alert.alert("패널티 발동", "연장 횟수 초과로 재가입이 제한됩니다.");
                }
              }}
            >
              <ThemedText style={styles.buttonText}>대여 시간 연장하기 (+1시간)</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}

        {/* 스탬프 및 쿠폰함 */}
        {activeTab === 'stamp' && (
          <ThemedView style={styles.sectionBox}>
            <TouchableOpacity style={styles.backButton} onPress={() => setActiveTab('main')}>
              <ThemedText style={styles.backButtonText}>⬅️ 메인 메뉴로 돌아가기</ThemedText>
            </TouchableOpacity>
            <ThemedText type="subtitle" style={styles.sectionTitle}>⭐ 대여 보상 스탬프 ({stampCount}/10)</ThemedText>
            <ThemedView style={styles.stampGrid}>
              {Array.from({ length: 10 }).map((_, index) => {
                const isStamped = index < stampCount;
                return (
                  <ThemedView key={index} style={[styles.stampItem, isStamped ? styles.stampedItem : styles.emptyStampItem]}>
                    <ThemedText style={[styles.stampText, isStamped && styles.stampedText]}>{isStamped ? '✓' : index + 1}</ThemedText>
                  </ThemedView>
                );
              })}
            </ThemedView>
            <TouchableOpacity style={styles.couponButton} onPress={() => Alert.alert("🎁 쿠폰함", `현재 보유 중인 무료 대여 쿠폰: ${couponCount}장\n(대여 시 쿠폰을 사용하여 무료로 대여하실 수 있습니다.)`)}>
              <ThemedText style={styles.couponButtonText}>🎁 쿠폰함 열기 (잔여: {couponCount}장)</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}

        {/* 분실/파손 신고 */}
        {activeTab === 'report' && (
          <ThemedView style={styles.sectionBox}>
            <TouchableOpacity style={styles.backButton} onPress={() => setActiveTab('main')}>
              <ThemedText style={styles.backButtonText}>⬅️ 메인 메뉴로 돌아가기</ThemedText>
            </TouchableOpacity>
            <ThemedText type="subtitle" style={styles.sectionTitle}>📸 분실 및 파손 상세 신고</ThemedText>
            <ThemedText style={styles.dateText}>🕒 신고 일시: {currentDateTime}</ThemedText>
            <TextInput
              style={styles.textInputBox}
              placeholder="내용을 입력하세요..."
              placeholderTextColor="#7f8c8d"
              multiline={true}
              value={reportContent}
              onChangeText={setReportContent}
            />
            <TouchableOpacity style={styles.photoButton} onPress={() => { setPhotoAttached(true); Alert.alert("첨부", "사진 첨부 완료!"); }}>
              <ThemedText style={styles.photoButtonText}>{photoAttached ? '✅ 사진 첨부 완료' : '📷 현장 사진 첨부'}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={() => {
              if (!reportContent.trim()) { Alert.alert("알림", "내용을 입력해주세요."); return; }
              Alert.alert("접수 완료", "관리자에게 신고되었습니다.");
              setReportContent(''); setPhotoAttached(false);
              setActiveTab('main');
            }}>
              <ThemedText style={styles.buttonText}>신고 접수하기</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#151718' },
  container: { padding: 20, paddingBottom: 40 },
  
  headerBox: { marginBottom: 20, padding: 16, borderRadius: 12, backgroundColor: '#1e2229' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mainTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  subTitle: { fontSize: 13, color: '#9ba1a6', marginTop: 2 },
  pointBadgeBox: { backgroundColor: '#2f3542', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#f39c12' },
  pointTitleText: { fontSize: 11, color: '#f39c12', fontWeight: 'bold' },
  pointValueText: { fontSize: 14, color: '#fff', fontWeight: 'bold', marginTop: 2 },

  // 메인 대형 툴 버튼 격자
  mainToolGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  bigToolButtonRental: { flex: 1, backgroundColor: '#00b894', padding: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center', minHeight: 130 },
  bigToolButtonReturn: { flex: 1, backgroundColor: '#6c5ce7', padding: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center', minHeight: 130 },
  bigToolEmoji: { fontSize: 32, marginBottom: 8 },
  bigToolTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  bigToolDesc: { fontSize: 11, color: '#dfe6e9', textAlign: 'center' },

  // 이벤트 배너 스타일
  eventBannerBox: { backgroundColor: '#8e44ad', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderWidth: 1, borderColor: '#a29bfe' },
  eventBannerBadge: { color: '#f1c40f', fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
  eventBannerTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  eventBannerSub: { color: '#dfe6e9', fontSize: 11, marginTop: 2 },
  eventBannerArrow: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginLeft: 8 },

  // 서브 관리 툴 격자
  subToolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subToolButton: { width: '48%', backgroundColor: '#2f3542', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  subToolButtonText: { color: '#dfe6e9', fontSize: 12, fontWeight: 'bold' },

  backButton: { marginBottom: 12, paddingVertical: 6 },
  backButtonText: { color: '#00cec9', fontSize: 13, fontWeight: 'bold' },

  sectionBox: { marginBottom: 20, padding: 16, borderRadius: 12, backgroundColor: '#1e2229' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  descText: { fontSize: 12, color: '#9ba1a6', marginBottom: 12 },

  // 검색창 스타일 추가
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#22262e', borderRadius: 8, borderWidth: 1, borderColor: '#2f3542', marginBottom: 14, paddingHorizontal: 12 },
  searchInput: { flex: 1, color: '#fff', paddingVertical: 10, fontSize: 13 },
  clearSearchBtn: { padding: 4 },
  
  boxContainer: { backgroundColor: '#22262e', padding: 12, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#2f3542' },
  boxHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  boxTitle: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  sterilizationBadge: { fontSize: 11, color: '#00b894', backgroundColor: '#1e3d33', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontWeight: 'bold' },
  sterilizationBadge2: { fontSize: 11, color: '#0984e3', backgroundColor: '#1a365d', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontWeight: 'bold' },

  bookItemButton: { backgroundColor: '#2f3542', padding: 10, borderRadius: 6, marginBottom: 6 },
  selectedBookItem: { backgroundColor: '#0a7ea4', borderWidth: 1, borderColor: '#fff' },
  bookItemText: { color: '#dfe6e9', fontSize: 13, fontWeight: '600' },

  ticketRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  ticketButton: { flex: 1, paddingVertical: 12, backgroundColor: '#2f3542', borderRadius: 8, alignItems: 'center' },
  selectedTicket: { backgroundColor: '#0a7ea4', borderWidth: 1, borderColor: '#fff' },
  rentalConfirmButton: { backgroundColor: '#00b894', padding: 14, borderRadius: 8, alignItems: 'center' },
  couponRentalButton: { backgroundColor: '#9b59b6', padding: 14, borderRadius: 8, alignItems: 'center' },
  
  authBox: { backgroundColor: '#1e272c', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#00b894', marginTop: 8 },
  authTitle: { fontSize: 13, color: '#00b894', fontWeight: 'bold', marginBottom: 4 },
  authDesc: { fontSize: 13, color: '#fff', marginBottom: 8 },
  highlightText: { color: '#f39c12', fontWeight: 'bold', fontSize: 16 },
  step2Button: { backgroundColor: '#0984e3', padding: 12, borderRadius: 6, alignItems: 'center', marginBottom: 6 },
  doorCloseButton: { backgroundColor: '#e67e22', padding: 12, borderRadius: 6, alignItems: 'center', marginTop: 6 },

  returnButton: { backgroundColor: '#6c5ce7', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  statusText: { fontSize: 14, color: '#fff', marginBottom: 8, fontWeight: '600' },
  actionButton: { backgroundColor: '#d63031', padding: 14, borderRadius: 8, alignItems: 'center' },
  disabledButton: { backgroundColor: '#636e72' },

  // 친구 추천 카드 스타일
  referralCard: { backgroundColor: '#22262e', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#8e44ad' },
  referralCardTitle: { color: '#a29bfe', fontSize: 12, fontWeight: 'bold' },
  referralCodeText: { color: '#f1c40f', fontSize: 24, fontWeight: 'bold', marginVertical: 6, letterSpacing: 2 },
  referralActionBtnFull: { width: '100%', backgroundColor: '#0984e3', paddingVertical: 12, borderRadius: 6, alignItems: 'center', marginTop: 8 },
  referralActionText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  inputCodeBox: { backgroundColor: '#22262e', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#2f3542' },
  textInputSingle: { backgroundColor: '#2f3542', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 10, fontSize: 13 },

  stampGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', marginBottom: 16 },
  stampItem: { width: '18%', aspectRatio: 1, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  emptyStampItem: { backgroundColor: '#2f3542', borderColor: '#485460' },
  stampedItem: { backgroundColor: '#0984e3', borderColor: '#74b9ff' },
  stampText: { fontSize: 12, color: '#b2bec3', fontWeight: 'bold' },
  stampedText: { fontSize: 16, color: '#fff' },
  couponButton: { backgroundColor: '#00b894', padding: 12, borderRadius: 8, alignItems: 'center' },
  couponButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  dateText: { fontSize: 13, color: '#00cec9', marginBottom: 8, fontWeight: '600' },
  textInputBox: { backgroundColor: '#2f3542', color: '#fff', padding: 12, borderRadius: 8, height: 80, textAlignVertical: 'top', marginBottom: 12, fontSize: 14 },
  photoButton: { backgroundColor: '#6c5ce7', padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  photoButtonText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  submitButton: { backgroundColor: '#e17055', padding: 12, borderRadius: 8, alignItems: 'center' }
});